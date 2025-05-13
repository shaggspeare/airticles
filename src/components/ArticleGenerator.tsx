'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Button } from './ui/button';

interface GeneratedArticle {
  originalTitle: string;
  originalAuthor: string;
  generatedArticle: string;
  timestamp: string;
}

interface ArticlesResponse {
  success: boolean;
  message: string;
  articles: GeneratedArticle[];
}

interface TitleContent {
  title: string;
  content: string;
}

export default function ArticleGenerator(): React.ReactElement {
  const [articles, setArticles] = useState<GeneratedArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<GeneratedArticle | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing articles on the component mount
  useEffect(() => {
    fetchArticles();
  }, []);

  // Fetch articles from the articles.json file
  const fetchArticles = async (): Promise<void> => {
    try {
      const response = await fetch('/api/articles');

      if (!response.ok) {
        // If file doesn't exist yet, this is expected
        if (response.status === 404) {
          setArticles([]);
          return;
        }
        throw new Error('Failed to fetch articles');
      }

      const data = await response.json() as GeneratedArticle[];
      setArticles(data);
    } catch (err) {
      console.error('Error fetching articles:', err);
      // Don't show error to user for initial fetch
    }
  };

  // Extract title from Markdown content (first h1)
  const extractTitle = (markdown: string): TitleContent => {
    let title = 'Generated Article';
    let content = markdown;

    // Find the first h1 heading
    const titleMatch = markdown.match(/^# (.+)$/m);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
      // Remove the title from the content for a separate rendering
      content = content.replace(/^# .+$/m, '').trim();
    }

    return { title, content };
  };

  const generateArticles = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Using the numPosts parameter to generate 3 articles
      const response = await fetch('/api/generate-article?numPosts=3');

      if (!response.ok) {
        throw new Error('Failed to generate articles');
      }

      const data = await response.json() as ArticlesResponse;

      if (data.success && data.articles) {
        setArticles(data.articles);
        // Clear any selected article
        setSelectedArticle(null);
      } else {
        throw new Error(data.message || 'Failed to generate articles');
      }
    } catch (err) {
      setError('Error generating articles. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewArticle = (article: GeneratedArticle): void => {
    setSelectedArticle(article);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToList = (): void => {
    setSelectedArticle(null);
  };

  // Use direct CSS classes that work with Tailwind v4
  const markdownComponents: Components = {
    h1: ({ children }) => (
      <h1 className="text-[2rem] font-bold mt-8 mb-4 text-[#292929]">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-[1.5rem] font-bold mt-6 mb-3 text-[#292929]">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-[1.25rem] font-bold mt-5 mb-2 text-[#292929]">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="mb-4 text-[1.125rem] leading-[1.8] text-[#292929]">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="pl-4 my-4 py-1 border-l-[3px] border-[#292929] italic text-[#555]">
        {children}
      </blockquote>
    ),
    ul: ({ children }) => (
      <ul className="list-disc mb-4 pl-5 text-[#292929] space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal mb-4 pl-5 text-[#292929] space-y-1">{children}</ol>
    ),
    li: ({ children }) => <li className="text-[1.125rem] text-[#292929]">{children}</li>,
    strong: ({ children }) => <strong className="font-bold text-[#292929]">{children}</strong>,
    em: ({ children }) => <em className="italic text-[#292929]">{children}</em>,
    a: ({ href, children }) => (
      <a href={href} className="text-[#1a8917] underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    code: ({ children }) => (
      <code className="bg-[#f3f4f6] px-1 py-0.5 rounded text-[0.875rem] font-mono">{children}</code>
    ),
    hr: () => <hr className="my-6 border-[#e6e6e6]" />,
  };

  // For the selected article view
  const renderArticleContent = () => {
    if (!selectedArticle) return null;

    const { title, content } = extractTitle(selectedArticle.generatedArticle);

    return (
      <div>
        <Button
          onClick={backToList}
          className="mb-6 bg-zinc-800 hover:bg-zinc-700 text-white"
        >
          ← Back to Articles
        </Button>

        <article className="font-serif bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-[2.5rem] font-bold mb-6 text-[#292929] leading-tight">
            {title || 'Generated Article'}
          </h1>

          <div className="text-sm text-zinc-500 mb-8">
            Original Post by: {selectedArticle.originalAuthor} •
            Generated on {new Date(selectedArticle.timestamp).toLocaleDateString()}
          </div>

          <div>
            <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
          </div>

          <div className="mt-12 pt-4 border-t border-[#e6e6e6] text-[#757575] text-[0.875rem]">
            Generated with AI • Based on content by {selectedArticle.originalAuthor}
          </div>
        </article>
      </div>
    );
  };

  // For the article list view
  const renderArticlesList = () => {
    return (
      <div>
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center">
          <Button
            onClick={generateArticles}
            disabled={loading}
            className="relative overflow-hidden group transition-all duration-300 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#4f46e5] hover:to-[#7c3aed] text-white font-medium py-2 px-6 rounded-md shadow-md hover:shadow-lg"
            size="lg"
          >
            <span className="relative z-10 flex items-center justify-center">
              {loading ? (
                <>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Generate New Articles</span>
                </>
              )}
            </span>
            <span className="absolute right-0 top-0 h-full w-12 -translate-x-12 translate-y-0 bg-white/20 transform rotate-12 transition-all duration-700 group-hover:translate-x-[30rem]"></span>
          </Button>

          <div className="text-sm text-zinc-500">
            {articles.length > 0 && `${articles.length} articles generated`}
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-[#fff4f4] text-[#c92a2a] border border-[#fee] rounded">
            {error}
          </div>
        )}

        {loading && (
          <div className="mb-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 p-6 rounded-lg animate-pulse">
                <div className="h-7 w-[80%] bg-zinc-800 rounded mb-4"></div>
                <div className="h-4 w-[60%] bg-zinc-800 rounded mb-2"></div>
                <div className="h-4 w-[90%] bg-zinc-800 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center p-10 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <p className="text-zinc-400 mb-4">No articles generated yet</p>
            <p className="text-zinc-500 text-sm">
              Click the button above to generate articles from Reddit posts
            </p>
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className="grid gap-6">
            {articles.map((article, index) => {
              // Extract title from the article content
              const { title } = extractTitle(article.generatedArticle);

              return (
                <div
                  key={index}
                  className="bg-white bg-opacity-5 hover:bg-opacity-10 p-6 rounded-lg transition-all cursor-pointer border border-zinc-800 hover:border-zinc-700"
                  onClick={() => viewArticle(article)}
                >
                  <h2 className="text-xl font-bold mb-2 text-white">
                    {title || article.originalTitle || 'Untitled Article'}
                  </h2>
                  <p className="text-zinc-400 text-sm mb-3">
                    Based on post by: {article.originalAuthor}
                  </p>
                  <p className="text-zinc-500 text-xs">
                    Generated on {new Date(article.timestamp).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[800px] mx-auto px-5 py-8">
      {selectedArticle ? renderArticleContent() : renderArticlesList()}
    </div>
  );
}