import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { ChatGroq } from "@langchain/groq"
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

dotenv.config()

const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

const ai = new ChatGroq({ "model": "openai/gpt-oss-120b" });


const client = new Client({
    name: 'client',
    version: "1.0.0"
})

async function start() {

    const transport = new StdioClientTransport({
        command: process.execPath,
        args: ["server.js"]
    })

    await client.connect(transport)
    const { tools } = await client.listTools();

    const modelwithTools = ai.bindTools(tools.map(t => ({
        type: "function",
        function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema
        }
    })))

    console.log(tools)

    app.post("/chat", async (req, res) => {

        const { prompt } = req.body;

        const response = await modelwithTools.invoke([
            {
                role: "human",
                content: prompt
            }
        ])

        if (response.tool_calls.length) {
            const tool = response.tool_calls[0]
            const result = await client.callTool({
                name: tool.name,
                arguments: tool.args
            })
            return res.json(result.content[0].text)

        }

        return res.json(response.content)

    })
}

start()

app.get("/", (req, res) => {
    res.status(200).json({
        message: "GET request successful"
    });
});

app.listen(PORT, () => console.log("Server started at " + PORT))