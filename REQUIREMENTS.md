# Smart Alt Text - Requirements

## Project Overview
A Shopify app that automatically generates SEO-optimized and accessibility-friendly Alt Text for product images using OpenAI's GPT API.

---

## Dependencies

```bash
npm install openai
```

---

## Environment Variables

Add to your `.env` file:

```
OPENAI_API_KEY=<your_openai_api_key>
```

---

## File Structure

```
app/
├── services/
│   └── openai.server.js             ← OpenAI API logic + prompts (server-only)
├── components/
│   └── ImageCard.jsx                ← Reusable image card UI component
├── routes/
│   ├── app.jsx                      ← Nav updated with Generate Alt Text link
│   └── app.generate-alt.jsx         ← loader + action + page component
├── shopify.server.js                ← Shopify auth (existing)
.env                                 ← OPENAI_API_KEY here
REQUIREMENTS.md                      ← This file
```

---

## AI Prompt Strategy

### System Prompt (in `app/services/openai.server.js`)
```
You are an expert E-commerce SEO Specialist and Accessibility Consultant.
Your goal is to generate high-quality, descriptive, and concise Alt Text for Shopify product images.
Focus on physical characteristics (color, material, shape) and the context provided by the product title.
Avoid redundant phrases like 'image of' or 'photo of'.
Keep the output under 125 characters to ensure compatibility with screen readers and search engine indexing.
```

### User Prompt (Dynamic - per image)
```
Please analyze the following product details and the provided image URL to generate an optimized Alt Text:

Product Title: {title}
Product Category: {productType}
Image URL: {imageUrl}

Task:
1. Describe exactly what is visible in the image.
2. Incorporate the product title naturally if it describes the visual.
3. Mention specific details like color, texture, or usage if they are prominent.
4. Output ONLY the final Alt Text string. Do not include any introductory remarks or explanations.
```

---

## Implementation Flow

### Step 1 — Fetch Data (Loader) ✅
- File: `app/routes/app.generate-alt.jsx`
- Fetches `id`, `title`, `productType`, `images (id, url, altText)` via Shopify GraphQL
- Cursor-based pagination: 10 products per page, `after`/`before` URL params

### Step 2 — Generate Alt Text (Action) ✅
- File: `app/routes/app.generate-alt.jsx` → calls `app/services/openai.server.js`
- On button click, sends `title`, `productType`, `imageUrl` to OpenAI
- Uses `gpt-4o` model with vision (`detail: "low"`) - actually image dekh ke alt text generate karta hai, 85 tokens per image
- Returns generated alt text back to UI via `useFetcher`

### Step 3 — Review Screen (UI) ✅
- File: `app/components/ImageCard.jsx`
- Shows product image, title, productType
- Polaris web component `s-text-field` pre-filled with AI-generated alt text
- User can manually edit before saving

### Step 4 — Update Shopify (Action) ✅
- File: `app/routes/app.generate-alt.jsx`
- On "Save" button click, runs `productImageUpdate` GraphQL mutation
- Success/error shown via `shopify.toast.show()`

---

## GraphQL

### Fetch Products Query
```graphql
{
  products(first: 20) {
    edges {
      node {
        id
        title
        productType
        media(first: 5) {
          edges {
            node {
              id
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Update Image Alt Text Mutation
```graphql
mutation productUpdateMedia($productId: ID!, $media: [UpdateMediaInput!]!) {
  productUpdateMedia(productId: $productId, media: $media) {
    media {
      ... on MediaImage {
        id
        image { altText }
      }
    }
    mediaUserErrors { field message }
  }
}
```

---

## UI Components (Shopify Polaris Web Components)

| Component | Purpose |
|-----------|---------|
| `s-page` | Main page wrapper |
| `s-section` | Wrap each product card |
| `s-stack` | Layout (inline / block) |
| `s-text` | Product title and type |
| `s-text-field` | Editable alt text field (125 char limit) |
| `s-button` | Generate and Save actions with loading state |
| `shopify.toast` | Success / error notifications via App Bridge |

---

## Navigation ✅
- File: `app/routes/app.jsx`
- `s-app-nav` updated with `/app/generate-alt` link

---

## Status

| Task | Status |
|------|--------|
| Project structure split into services/components/routes | ✅ Done |
| OpenAI service (`openai.server.js`) | ✅ Done |
| ImageCard component (`ImageCard.jsx`) | ✅ Done |
| Route file (`app.generate-alt.jsx`) | ✅ Done |
| Nav link added in `app.jsx` | ✅ Done |
| `.env` OPENAI_API_KEY | ⬜ Add manually |
