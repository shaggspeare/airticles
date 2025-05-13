import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface GeneratedArticle {
  originalTitle: string;
  originalAuthor: string;
  generatedArticle: string;
  timestamp: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    // Path to the articles.json file
    const filePath = path.join(process.cwd(), 'articles.json');

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([], { status: 404 });
    }

    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Parse the JSON data
    const articles = JSON.parse(fileContent) as GeneratedArticle[];

    // Return the articles
    return NextResponse.json(articles);
  } catch (error: any) {
    console.error('Error reading articles file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read articles file' },
      { status: 500 }
    );
  }
}