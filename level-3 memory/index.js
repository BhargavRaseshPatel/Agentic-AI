import { ChatGoogle } from "@langchain/google";
import { Command, interrupt, StateGraph, StateSchema } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { MongoClient } from "mongodb";
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

// const checkpointer = new MemorySaver()

const client = new MongoClient(process.env.MONGODB_URL)
const checkpointer = new MongoDBSaver({ client });


const customState = new StateSchema({
    prompt: z.string(),
    approvalRequires: z.boolean(),
    aiResponse: z.string(),
    approved: z.boolean(),
    result: z.string().optional()
})

const model = new ChatGoogle("gemini-3.1-pro-preview")

const agent = async (state) => {
    const result = await model.invoke([
        {
            role: "system",
            content: `You are a helpful assisstant.
            
            If the user is greeting or asking a normal question,
            respond normally and set approvalRequires to false.
            
            If the request requires a sensitive external action, 
            such as sending an email or deleting a file, 
            set approvalRequires to true.
            
            Return JSON with:
            {
                "response" : "your response",
                "approvalRequires" : true or false
            }`
        },
        {
            role: "human",
            content: state.prompt
        }
    ])

    const parsed = JSON.parse(result.content)

    return {
        aiResponse: parsed.response,
        approvalRequires: parsed.approvalRequires
    }
}


const approvalNode = async (state) => {
    const answer = interrupt({
        message: "Do you approve this action ?",
        prompt: state.prompt,
        aiResponse: state.aiResponse
    })

    return {
        approved: String(answer).trim().toLowerCase() === "yes"
    }
}

const actionNode = async (state) => {
    if (state.approved) {
        return {
            result: `action approved`
        }
    }

    return {
        result: "action reject by human"
    }
}

const shouldContinue = async (state) => {
    if (state.approvalRequires) {
        return "approval"
    }
    return "__end__"
}

const graph = new StateGraph(customState)
    .addNode("agent", agent)
    .addNode("approval", approvalNode)
    .addNode("action", actionNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("approval", "action")
    .addEdge("action", "__end__")
    .compile({ checkpointer })


app.post("/chat", async (req, res) => {
    const { prompt } = req.body;
    const thread_id = randomUUID();

    const result = await graph.invoke({
        prompt
    },
        {
            configurable: { thread_id: thread_id }
        }
    )
    console.log(result.messages)
    return res.json({
        threadId: thread_id,
        result: result.result,
        ai: result.aiResponse
    })
})


app.post("/chat/resume", async (req, res) => {
    const { threadId, answer } = req.body;

    const result = await graph.invoke(
        new Command({
            resume: String(answer)
        }),
        {
            configurable: { thread_id: threadId }
        }
    )

    // console.log(result)
    return res.json({ threadId, result: result.result })
})

app.get("/", (req, res) => {
    res.status(200).json({
        message: "GET request successful"
    });
});

app.listen(PORT, () => console.log("Server started at " + PORT))