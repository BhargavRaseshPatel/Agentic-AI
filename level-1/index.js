import express from "express"
import dotenv from "dotenv"
import { Groq } from 'groq-sdk';
import cors from "cors"

dotenv.config()

const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

const main = async (text) => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const chatCompletion = await groq.chat.completions.create({
        "messages": [
            {
                "role": "user",
                "content": text ?? 'How are you ?'
            }
        ],
        "model": "openai/gpt-oss-20b",
        "temperature": 1,
        "max_completion_tokens": 2048,
        "top_p": 1,
        "stream": true,
        "reasoning_effort": "medium",
        "stop": null
    });

    // return chatCompletion

    for await (const chunk of chatCompletion) {
        process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }

}

main();

app.post("/chat", async(req, res) => {
    const { prompt } = req.body;

    // await main(prompt)

    // return null
})

app.get("/", (req, res) => {
    res.status(200).json({
        message: "GET request successful"
    });
});

app.listen(PORT, () => console.log("Server started at " + PORT))