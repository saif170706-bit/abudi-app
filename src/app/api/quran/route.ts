
import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    // Find the absolute path to the json file
    const jsonDirectory = path.join(process.cwd(), 'public');
    // Read the json file
    const fileContents = await fs.readFile(path.join(jsonDirectory, 'quran.json'), 'utf8');
    // Parse the json file
    const data = JSON.parse(fileContents);
    // Return the json data
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to read Quran data' }, { status: 500 });
  }
}
