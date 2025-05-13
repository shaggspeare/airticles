import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// TypeScript interfaces
interface Reply {
  text?: string;
  replies?: Reply[];
}

interface Comment {
  text?: string;
  replies?: Reply[];
}

interface Post {
  title?: string;
  author?: string;
  text?: string;
  comments?: Comment[];
}

interface GeneratedArticle {
  originalTitle: string;
  originalAuthor: string;
  generatedArticle: string;
  timestamp: string;
}

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to read the posts.json file
function readPostsFile(): Post | Post[] {
  try {
    const filePath = path.join(process.cwd(), 'posts.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading posts.json:', error);
    throw new Error('Failed to read posts file');
  }
}

// Function to write to articles.json file
function writeArticlesFile(articles: GeneratedArticle[]): void {
  try {
    const filePath = path.join(process.cwd(), 'articles.json');
    fs.writeFileSync(filePath, JSON.stringify(articles, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to articles.json:', error);
    throw new Error('Failed to write articles file');
  }
}

// Function to format post data for the AI to process
function formatPostData(post: Post): string {
  // Extract relevant data from the post
  const { title = '', author = '', text = '', comments = [] } = post;

  // Format top-level post data
  let formattedData = `# ${title}\n\n**Posted by ${author}**\n\n${text}\n\n`;

  // Add top comments (limit to 5 for reasonable context)
  if (comments && comments.length > 0) {
    formattedData += '## Top Comments\n\n';
    const topComments = comments.slice(0, 5);

    topComments.forEach(comment => {
      formattedData += `**Comment by ${comment.text ? 'user' : 'unknown'}**:\n${comment.text || ''}\n\n`;

      // Add one level of replies if available (limit to 2 replies)
      if (comment.replies && comment.replies.length > 0) {
        const topReplies = comment.replies.slice(0, 2);
        topReplies.forEach(reply => {
          formattedData += `> Reply: ${reply.text || ''}\n\n`;
        });
      }
    });
  }

  return formattedData;
}

// Function to generate an article from post data using OpenAI
async function generateArticle(postData: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: `You are an expert digital magazine editor who transforms social media discussions into polished, 
          professional articles. You excel at extracting insights from comments and weaving them seamlessly 
          into a cohesive narrative. Your articles should be informative, nuanced, and engaging - suitable 
          for publication in respected digital media outlets.`,
        },
        {
          role: 'user',
          content: `Transform this social media post and its comments into a polished magazine-style article.

IMPORTANT FORMATTING GUIDELINES:
- Use a single # for the main title
- Use ## for section headings
- Use proper paragraphs with clear transitions
- Use > for important quotes or insights
- Bold key points with **text**
- Use bullet points sparingly for lists
- The article should read as one cohesive piece written by a single author

CONTENT GUIDELINES:
- Don't present the comments as separate sections - integrate insights from comments naturally into the article
- Use information from comments to add depth, alternative perspectives, and expert insights
- Maintain the original topic but elevate the writing style to be more professional and journalistic
- If there are differing opinions in the comments, present them as balanced perspectives in the article
- Include relevant technical details when they add value
- Create an engaging narrative flow that builds on the original post
- Add a brief conclusion that summarizes key takeaways
- Stay faithful to the facts and information presented in the original content

Here's the content to transform:

${postData}`,
        },
      ],
      temperature: 0.7, // Slightly increased creativity while maintaining coherence
      max_tokens: 2000, // Adjust based on your expected article length
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating article with OpenAI:', error);
    throw new Error('Failed to generate article');
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Get the number of posts to process from query parameter, default to 3
    const url = new URL(request.url);
    const numPosts = parseInt(url.searchParams.get('numPosts') || '3', 10);
    const forceRegenerate = url.searchParams.get('force') === 'true';

    // Read posts from file
    const postData = readPostsFile();

    // Check if we have a valid post object with title property
    // If not, assume we have an object with embedded data
    let posts: Post[] = [];
    if ((postData as Post).title) {
      // Single post format
      posts = [postData as Post];
    } else if ((postData as Post).text) {
      // Reddit style JSON with post in 'text' field
      posts = [postData as Post];
    } else {
      // Try to find posts array or treat the whole object as an array
      posts = Array.isArray(postData) ? postData : [postData as Post];
    }

    // Read existing articles if the file exists
    let existingArticles: GeneratedArticle[] = [];
    try {
      const articlesFilePath = path.join(process.cwd(), 'articles.json');
      if (fs.existsSync(articlesFilePath) && !forceRegenerate) {
        const articlesContent = fs.readFileSync(articlesFilePath, 'utf8');
        existingArticles = JSON.parse(articlesContent);
      }
    } catch (error) {
      console.warn('No existing articles found or unable to read articles.json');
      // Continue with empty array if file doesn't exist or can't be read
    }

    // Track which posts have already been processed by title
    const processedTitles = new Set(existingArticles.map(article => article.originalTitle));

    // Find posts that haven't been processed yet
    const unprocessedPosts = posts.filter(
      post => !processedTitles.has(post.title || 'Untitled Post')
    );

    // Take only the number of new posts requested, up to numPosts
    const postsToProcess = unprocessedPosts.slice(0, numPosts);

    // If we have no new posts to process, return the existing articles
    if (postsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new posts to process. All posts have already been generated into articles.',
        articles: existingArticles,
      });
    }

    // Generate articles for each new post
    const newArticles: GeneratedArticle[] = [];
    for (const post of postsToProcess) {
      const formattedPost = formatPostData(post);
      const article = await generateArticle(formattedPost);

      newArticles.push({
        originalTitle: post.title || 'Untitled Post',
        originalAuthor: post.author || 'Unknown Author',
        generatedArticle: article,
        timestamp: new Date().toISOString(),
      });
    }

    // Combine existing and new articles
    const allArticles = [...existingArticles, ...newArticles];

    // Write the combined articles to articles.json
    writeArticlesFile(allArticles);

    // Return the combined articles
    return NextResponse.json({
      success: true,
      message: `Generated ${newArticles.length} new articles. Total: ${allArticles.length}`,
      articles: allArticles,
    });
  } catch (error: any) {
    console.error('Error processing posts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process posts' },
      { status: 500 }
    );
  }
}
