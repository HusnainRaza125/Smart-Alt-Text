import { data, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { generateAltText } from "../services/openai.server";
import { ProductGroup } from "../components/ProductGroup";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  let allEdges = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await admin.graphql(`#graphql
      query getProducts($after: String) {
        products(first: 250, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              productType
              description
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
    `, { variables: { after: cursor } });

    const responseData = await response.json();
    const { edges, pageInfo } = responseData.data.products;

    allEdges = [...allEdges, ...edges];
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }

  const products = allEdges.map(({ node: product }) => ({
    node: {
      ...product,
      images: product.media.edges
        .filter(({ node }) => node.image && !node.image.altText?.trim())
        .map(({ node }) => ({
          node: {
            id: node.id,
            url: node.image.url,
            altText: node.image.altText,
          },
        })),
      description: product.description,
    },
  })).filter(({ node }) => node.images.length > 0);

  return data({ products });
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "generate") {
    const altText = await generateAltText({
      title: formData.get("title"),
      productType: formData.get("productType"),
      description: formData.get("description"),
      imageUrl: formData.get("imageUrl"),
      shop: session.shop,
    });
    if (!altText) return data({ error: "OpenAI API key not set. Please add it in Settings." });
    return data({ altText });
  }

  if (intent === "save") {
    const productId = formData.get("productId");
    const imageId = formData.get("imageId");
    const altText = formData.get("altText");

    const response = await admin.graphql(
      `#graphql
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
      }`,
      { variables: { productId, media: [{ id: imageId, alt: altText }] } }
    );

    const result = await response.json();
    const errors = result.data.productUpdateMedia.mediaUserErrors;

    if (errors.length > 0) return data({ error: errors[0].message });

    return data({ success: true });
  }
};

export default function GenerateAlt() {
  const { products } = useLoaderData();

  return (
    <s-page heading="Generate Alt Text">
      {products.length > 0 ? (
        products.map(({ node: product }) => (
          <ProductGroup key={product.id} product={product} />
        ))
      ) : (
        <s-section>
          <s-paragraph>
            <s-text tone="success">🎉 All product images already have alt text!</s-text>
          </s-paragraph>
        </s-section>
      )}
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
