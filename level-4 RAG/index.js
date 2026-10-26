import { ChatGoogle } from "@langchain/google";
import { Command, interrupt, StateGraph, StateSchema } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { MongoClient } from "mongodb";
import { randomUUID, verify } from 'node:crypto';
import { z } from 'zod';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import fs from 'fs'
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())


const model = new ChatGoogle("gemini-3.1-pro-preview")

const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001", // 768 dimensions,
    //   apiKey : process.env.GOOGLE_API_KEY,
    //   taskType: TaskType.RETRIEVAL_DOCUMENT,
    //   title: "Document title",
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    collectionName: "FreshMartStore",
    apiKey: process.env.QDRANT_API_KEY
});

const upload = async () => {
    const path = './knowledge.pdf'
    const buffer = fs.readFileSync(path)
    const pdfResult = new PDFParse({ data: buffer })
    const result = await pdfResult.getText()
    const text = result.text
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 1 })
    const docs = await splitter.createDocuments([text])
    await vectorStore.addDocuments(docs)

    console.log(texts)
}

app.post("/chat", async (req, res) => {
    const { prompt } = req.body
    const docs = await vectorStore.similaritySearch(prompt, 5)
    const context = docs.map(doc => doc.pageContent).join("\n")
    const result =await model.invoke([
        {
            role: "system",
            content: `you are a rag assistant and use this context ${context}`
        },
        {
            role: "human",
            content: prompt
        }
    ])
   return res.json(result.content)
})

app.get("/", (req, res) => {
    res.status(200).json({
        message: "GET request successful"
    });
});

app.listen(PORT, () => console.log("Server started at " + PORT))