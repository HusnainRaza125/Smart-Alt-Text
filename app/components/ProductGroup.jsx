import { useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

function ImageCard({ productId, productTitle, productType, productDescription, image, index }) {
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
    <div style={{
      border: "1px solid #e1e3e5",
      borderRadius: "8px",
      overflow: "hidden",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
    }}>
      <img
        src={image.url}
        alt={altText}
        style={{
          width: "100%",
          height: "160px",
          objectFit: "cover",
        }}
      />

      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        <textarea
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          maxLength={125}
          rows={3}
          style={{
            width: "100%",
            padding: "8px",
            fontSize: "13px",
            border: "1px solid #c9cccf",
            borderRadius: "6px",
            resize: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            outline: "none",
            color: "#202223",
          }}
          placeholder="Generate alt text..."
        />
        <p style={{ fontSize: "11px", color: "#6d7175", margin: 0 }}>
          {altText.length}/125
        </p>

        <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="generate" />
            <input type="hidden" name="title" value={productTitle} />
            <input type="hidden" name="productType" value={productType || ""} />
            <input type="hidden" name="description" value={productDescription || ""} />
            <input type="hidden" name="imageUrl" value={image.url} />
            <s-button variant="primary" type="submit" {...(isGenerating ? { loading: true } : {})}>
              Generate
            </s-button>
          </fetcher.Form>

          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="save" />
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="imageId" value={image.id} />
            <input type="hidden" name="altText" value={altText} />
            <s-button type="submit" {...(isSaving ? { loading: true } : {})}>
              Save
            </s-button>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}

export function ProductGroup({ product }) {
  return (
    <div style={{
      border: "1px solid #e1e3e5",
      borderRadius: "12px",
      overflow: "hidden",
      marginBottom: "24px",
      background: "#f6f6f7",
    }}>
      {/* Product Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #e1e3e5",
        background: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: "600", fontSize: "15px", color: "#202223" }}>
            {product.title}
          </p>
          {product.productType && (
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6d7175" }}>
              {product.productType}
            </p>
          )}
        </div>
        <span style={{
          background: "#f0f0f0",
          borderRadius: "20px",
          padding: "4px 12px",
          fontSize: "12px",
          color: "#6d7175",
        }}>
          {product.images.length} image{product.images.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Images Grid */}
      <div style={{
        padding: "16px",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
      }}>
        {product.images.map((image, index) => (
          <ImageCard
            key={image.node.id}
            productId={product.id}
            productTitle={product.title}
            productType={product.productType}
            productDescription={product.description}
            image={image.node}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
