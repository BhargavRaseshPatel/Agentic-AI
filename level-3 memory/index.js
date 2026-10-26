import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { ChatGoogle } from "@langchain/google";
import { ChatGroq } from "@langchain/groq"
import { TavilySearch } from "@langchain/tavily";
import { context, createAgent, HumanMessage, tool } from 'langchain'
import { z } from 'zod'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { MessagesAnnotation, StateGraph, MemorySaver } from "@langchain/langgraph";

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

// tavily search
// const tool1 = new TavilySearch({
//     topic: "general"
// })

const checkpointer = new MemorySaver()

const tool1 = tool(({ email, content }) => {
    return `email sent successfully to ${email} with content ${content}`
},
    {
        name: "email_send_tool",
        description: "use this tool to send email",
        schema: z.object({
            email: z.string().describe("sender email"),
            content: z.string().describe("mail content for sending")
        })
    }
)

// custom search
const tool2 = tool(({ a, b }) => {
    return `addition of ${a} & ${b} is ${a + b}`
}, {
    name: "addition_tool",
    description: "use this tool for addition for two numbers",
    schema: z.object({
        a: z.number(),
        b: z.number()
    })
})

const tools = [tool1, tool2]
const model = new ChatGoogle("gemini-3.1-pro-preview").bindTools(tools);

const toolNode = new ToolNode(tools);

const agent = async (state) => {
    const result = await model.invoke(state.messages)

    return {
        messages : [result]
    }
}

const shouldContinue = (state) => {

    if(state.messages[state.messages.length-1].tool_calls?.length > 0){
        return "tool_node"
    } else {
        return "__end__"
    }
}

const graph = new StateGraph(MessagesAnnotation)
    .addNode("agent", agent)
    .addNode("tool_node", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent",shouldContinue)
    .addEdge("tool_node","agent")
    .compile({checkpointer})

app.post("/chat", async (req, res) => {
    const { prompt } = req.body;
    const result = await graph.invoke({
        messages : [
            {
                role : "user",
                content : prompt
            }
        ]
    }, 
    {
        configurable: {thread_id : "user_123"}
    }
)
    
    console.log(result.messages)
    return res.json(result.messages[result.messages.length-1].content)
})

    
app.get("/", (req, res) => {
    res.status(200).json({
        message: "GET request successful"
    });
});

app.listen(PORT, () => console.log("Server started at " + PORT))