// Import the Pinecone library
import { Pinecone } from '@pinecone-database/pinecone';
// import 'dotenv/config';

// Initialize a Pinecone client with your API key
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

//secify the name of the index in techease
const index = pc.index('techease');

//create a function to upload/upsert to the index
export async function upsertToIndex(data: any[]) {
    return await index.upsert(data);
}

//query function. TO search the index in pinecone, we need to pass the vector
// the call will be the index.query
//we can also pass teh number of results that we want. The best results that is
// we also need to pass the metadata as we saved our content to the metadata
export async function searchIndex(vector: number[]) {
    return await index.query({ vector, topK: 3, includeMetadata: true });
}
