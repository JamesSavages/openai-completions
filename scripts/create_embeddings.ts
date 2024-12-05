// import 'dotenv/config';
import { error } from 'console';
import { readFileSync } from 'fs';
import { join } from 'path';
import { splitTextIntoChunks } from '../services/utilitiess.service';
import { embed } from '../services/openai.service';
import { v4 as uuidv4 } from 'uuid';
import { upsertToIndex } from '../services/embedder.service';

async function main() {
    const contents = readFileSync(join(__dirname, './../kdb.txt'), 'utf8'); //we first need to get the contents of the file, so we will read it. This file is 1 level up, which we pass on the join function
    // console.log(contents.length);
    //refer to the utilitiles
    const chunks = splitTextIntoChunks(contents); //slice(0, 1);
    // console.log(chunks.length);

    let i = 0;
    const len = chunks.length;
    const data = []; //for each chunk we will call the embed process and add to the data array
    for (const chunk of chunks) {
        i++;
        console.log(`Processing chunk ${i} of ${len}`);
        const result = await embed(chunk);
        console.log(result); //we will take a look at the results first

        //we will push the array with vectors with spefic params.
        //We will use pinecone, so we will need to format in array that pinecone expects.
        //we will create a method for pinecone and we will create an index on pinecone.
        data.push({
            id: uuidv4(),
            values: result[0].embedding,
            metadata: {
                content: chunk,
            },
        });
    }

    console.log(data);

    await upsertToIndex(data);
}

main().catch(error => console.error);
