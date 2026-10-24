import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { ChatGoogle } from "@langchain/google";
import { ChatGroq } from "@langchain/groq"
import { TavilySearch } from "@langchain/tavily";
import { createAgent, tool } from 'langchain'
import { z } from 'zod'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

// tavily search
// const tool1 = new TavilySearch({
//     topic: "general"
// })

const tool1 = tool(({ email, content }) => {
    return `email sent successfully to ${email} with content ${content}`
},
    {
        name: "email_send_tool",
        description: "use this took to send email",
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

const model = new ChatGoogle("gemini-3.1-pro-preview");
app.post("/chat", async (req, res) => {
    const { prompt } = req.body;
    const agent = createAgent({
        model,
        tools: [tool1, tool2]
    })

    const result = await agent.invoke({
        messages: [
            {
                role: "user",
                content: prompt
            },

        ]
    })

    // console.log(result.messages)

    console.log(result.messages[result.messages.length - 1].content)

    return res.json("successfull")
})

app.get("/", (req, res) => {
    res.status(200).json({
        message: "GET request successful"
    });
});

app.listen(PORT, () => console.log("Server started at " + PORT))