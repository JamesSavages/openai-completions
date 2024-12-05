//we will query the newly created database. We will pass an item to search for
// we can use the embedding result to search our index. We will use the searchindex funtion
// import 'dotenv/config';

import { searchIndex } from '../services/embedder.service';
import { embed } from '../services/openai.service';

async function main() {
    const query = 'Error Code 3707';
    const embeddingResult = await embed(query);

    const vector = embeddingResult[0].embedding;
    const matches = (await searchIndex(vector)).matches;

    console.log('Matches:', matches);
}

main().catch(error => console.error);
