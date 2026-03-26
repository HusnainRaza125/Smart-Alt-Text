import { useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

function ImageRow({ productId, productTitle, productType, image, index }) {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [altText, setAltText] = useState(image.altText || "");

  const isGenerating =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "generate";

  const isSaving =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "save";

  useEffect(() => {
    if (fetcher.data?.altText) setAltText(fetcher.data.altText);
  }, [fetcher.data?.altText]);

  useEffect(() => {
    if (fetcher.data?.success) shopify.toast.show("Alt text saved!");
    if (fetcher.data?.error) shopify.toast.show(fetcher.data.error, { isError: true });
  }, [fetcher.data?.success, fetcher.data?.error, shopify]);

  return (
    <s-section heading={`Image ${index + 1}`}>
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>

        <img
          src={image.url}
          alt={altText}
          style={{
            width: "140px",
            height: "140px",
            objectFit: "cover",
            borderRadius: "8px",
            flexShrink: 0,
            border: "1px solid #e1e3e5",
          }}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px", color: "#202223" }}>
              Alt Text
            </label>
            <textarea
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              maxLength={125}
              rows={3}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "14px",
                border: "1px solid #c9cccf",
                borderRadius: "6px",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
                outline: "none",
              }}
              placeholder="Click 'Generate with AI' to auto-generate alt text..."
            />
            <p style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              {altText.length}/125 characters
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="generate" />
              <input type="hidden" name="title" value={productTitle} />
              <input type="hidden" name="productType" value={productType || ""} />
              <input type="hidden" name="imageUrl" value={image.url} />
              <s-button
                variant="primary"
                type="submit"
                {...(isGenerating ? { loading: true } : {})}
              >
                Generate with AI
              </s-button>
            </fetcher.Form>

            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="productId" value={productId} />
              <input type="hidden" name="imageId" value={image.id} />
              <input type="hidden" name="altText" value={altText} />
              <s-button
                type="submit"
                {...(isSaving ? { loading: true } : {})}
              >
                Save to Shopify
              </s-button>
            </fetcher.Form>
          </div>
        </div>

      </div>
    </s-section>
  );
}

export function ProductGroup({ product }) {
  return (
    <s-section heading={product.title}>
      {product.productType && (
        <s-paragraph>
          <s-text tone="subdued">Category: {product.productType}</s-text>
        </s-paragraph>
      )}
      <s-paragraph>
        <s-text tone="subdued">
          {product.images.length} image{product.images.length !== 1 ? "s" : ""}
        </s-text>
      </s-paragraph>

      {product.images.map((image, index) => (
        <ImageRow
          key={image.node.id}
          productId={product.id}
          productTitle={product.title}
          productType={product.productType}
          image={image.node}
          index={index}
        />
      ))}
    </s-section>
  );
}
