import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an expert E-commerce SEO Specialist and Accessibility Consultant. Your goal is to generate high-quality, descriptive, and concise Alt Text for Shopify product images. Focus on physical characteristics (color, material, shape) and the context provided by the product title. Avoid redundant phrases like 'image of' or 'photo of'. Keep the output under 125 characters to ensure compatibility with screen readers and search engine indexing.`;

// Shopify CDN image URL mein size parameter inject karta hai
function resizeShopifyImage(url, size = "512x512") {
  if (!url) return url;
  // Shopify image URL format: image.jpg?v=123 ya image_800x.jpg
  return url.replace(/\.jpg(\?|$)/i, `_${size}.jpg$1`)
            .replace(/\.png(\?|$)/i, `_${size}.png$1`)
            .replace(/\.webp(\?|$)/i, `_${size}.webp$1`);
}

export async function generateAltText({ title, productType, imageUrl }) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resizedUrl = resizeShopifyImage(imageUrl);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Please analyze the following product details and the provided image to generate an optimized Alt Text:

Product Title: ${title}
Product Category: ${productType}

Task:
1. Describe exactly what is visible in the image.
2. Incorporate the product title naturally if it describes the visual.
3. Mention specific details like color, texture, or usage if they are prominent.
4. Output ONLY the final Alt Text string. Do not include any introductory remarks or explanations.`,
          },
          {
            type: "image_url",
            image_url: {
              url: resizedUrl,
              detail: "low",
            },
          },
        ],
      },
    ],
  });

  return completion.choices[0].message.content.trim();
}
