import { data, useLoaderData, useRouteError } from "react-router";
import { useFetcher } from "react-router";
import { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { generateAltText } from "../services/openai.server";
import { BulkReview } from "../components/BulkReview";

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

  if (intent === "generateAll") {
    const productsJson = formData.get("products");
    const products = JSON.parse(productsJson);

    const results = await Promise.all(
      products.flatMap(({ node: product }) =>
        product.images.map(async (image) => ({
          productId: product.id,
          imageId: image.node.id,
          imageUrl: image.node.url,
          generatedAlt: await generateAltText({
            title: product.title,
            productType: product.productType,
            description: product.description,
            imageUrl: image.node.url,
            shop: session.shop,
          }),
        }))
      )
    );

    if (results.some((r) => !r.generatedAlt))
      return data({ error: "OpenAI API key not set. Please add it in Settings." });
    // Merge generated alts back into products
    const updatedProducts = products.map(({ node: product }) => ({
      node: {
        ...product,
        images: product.images.map((image) => ({
          node: {
            ...image.node,
            generatedAlt: results.find((r) => r.imageId === image.node.id)?.generatedAlt || "",
          },
        })),
      },
    }));

    return data({ generatedProducts: updatedProducts });
  }

  if (intent === "saveAll") {
    const bulkData = JSON.parse(formData.get("bulkData"));

    const errors = [];
    for (const { productId, imageId, altText } of bulkData) {
      const response = await admin.graphql(
        `#graphql
        mutation productUpdateMedia($productId: ID!, $media: [UpdateMediaInput!]!) {
          productUpdateMedia(productId: $productId, media: $media) {
            mediaUserErrors { field message }
          }
        }`,
        { variables: { productId, media: [{ id: imageId, alt: altText }] } }
      );
      const result = await response.json();
      const errs = result.data.productUpdateMedia.mediaUserErrors;
      if (errs.length > 0) errors.push(errs[0].message);
    }

    if (errors.length > 0) return data({ error: errors[0] });
    return data({ success: true });
  }
};

export default function BulkAlt() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [reviewProducts, setReviewProducts] = useState(null);

  const isGenerating = fetcher.state !== "idle";
  const totalImages = products.reduce((acc, { node: p }) => acc + p.images.length, 0);

  // When generation is done, show review screen
  if (fetcher.data?.generatedProducts && !reviewProducts) {
    setReviewProducts(fetcher.data.generatedProducts);
  }

  if (reviewProducts) {
    return (
      <s-page heading="Review Alt Texts">
        <BulkReview
          products={reviewProducts}
          onReset={() => setReviewProducts(null)}
        />
      </s-page>
    );
  }

  return (
    <s-page heading="Bulk Generate Alt Text">
      <s-section heading="Missing Alt Texts">
        <s-paragraph>
          <s-text>
            Found <strong>{totalImages}</strong> image{totalImages !== 1 ? "s" : ""} across{" "}
            <strong>{products.length}</strong> product{products.length !== 1 ? "s" : ""} missing alt text.
          </s-text>
        </s-paragraph>

        {totalImages === 0 ? (
          <s-paragraph>
            <s-text tone="success">🎉 All product images already have alt text!</s-text>
          </s-paragraph>
        ) : (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="generateAll" />
            <input type="hidden" name="products" value={JSON.stringify(products)} />
            <s-button
              variant="primary"
              type="submit"
              {...(isGenerating ? { loading: true } : {})}
            >
              {isGenerating ? `Generating ${totalImages} alt texts...` : `Generate All (${totalImages} images)`}
            </s-button>
          </fetcher.Form>
        )}
      </s-section>

      {products.map(({ node: product }) => (
        <s-section key={product.id} heading={product.title}>
          <s-paragraph>
            <s-text tone="subdued">
              {product.images.length} image{product.images.length !== 1 ? "s" : ""} missing alt text
            </s-text>
          </s-paragraph>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {product.images.map((image) => (
              <img
                key={image.node.id}
                src={image.node.url}
                alt=""
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  border: "1px solid #e1e3e5",
                }}
              />
            ))}
          </div>
        </s-section>
      ))}
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
