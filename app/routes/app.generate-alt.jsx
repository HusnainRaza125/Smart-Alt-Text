import { data, useLoaderData, useRouteError, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { generateAltText } from "../services/openai.server";
import { ProductGroup } from "../components/ProductGroup";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const after = url.searchParams.get("after") || null;
  const before = url.searchParams.get("before") || null;
  const isBack = !!before;

  const response = await admin.graphql(`#graphql
    query getProducts($first: Int, $last: Int, $after: String, $before: String) {
      products(first: $first, last: $last, after: $after, before: $before) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
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
  `, {
    variables: isBack
      ? { last: 10, before }
      : { first: 10, after },
  });

  const responseData = await response.json();
  const { edges, pageInfo } = responseData.data.products;

  const products = edges.map(({ node: product }) => ({
    node: {
      ...product,
      images: product.media.edges
        .filter(({ node }) => node.image)
        .map(({ node }) => ({
          node: {
            id: node.id,
            url: node.image.url,
            altText: node.image.altText,
          },
        })),
    },
  }));

  return data({ products, pageInfo });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "generate") {
    const altText = await generateAltText({
      title: formData.get("title"),
      productType: formData.get("productType"),
      imageUrl: formData.get("imageUrl"),
    });
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
  const { products, pageInfo } = useLoaderData();
  const navigate = useNavigate();

  return (
    <s-page heading="Generate Alt Text">
      {products.map(({ node: product }) => (
        <ProductGroup key={product.id} product={product} />
      ))}

      <s-section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {pageInfo.hasPreviousPage ? (
            <s-button onClick={() => navigate(`?before=${pageInfo.startCursor}`)}>← Previous</s-button>
          ) : <span />}

          {pageInfo.hasNextPage ? (
            <s-button variant="primary" onClick={() => navigate(`?after=${pageInfo.endCursor}`)}>Next →</s-button>
          ) : <span />}
        </div>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
