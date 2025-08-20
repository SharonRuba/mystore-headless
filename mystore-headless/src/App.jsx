import { useEffect, useState } from "react";
import { shopify } from "./shopify";

function App() {
  const [products, setProducts] = useState([]);
  const [cartId, setCartId] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);

  // 🔹 Create cart on first load
  useEffect(() => {
    async function createCart() {
      const mutation = `
        mutation {
          cartCreate {
            cart {
              id
              checkoutUrl
            }
          }
        }
      `;
      const data = await shopify(mutation);
      setCartId(data.cartCreate.cart.id);
      setCheckoutUrl(data.cartCreate.cart.checkoutUrl);
    }
    createCart();
  }, []);

  // 🔹 Fetch products
  useEffect(() => {
    async function fetchProducts() {
      const query = `
        query {
          products(first: 8) {
            edges {
              node {
                id
                title
                description
                images(first: 1) {
                  edges {
                    node {
                      src
                      altText
                    }
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
      const data = await shopify(query);
      setProducts(data.products.edges);
    }
    fetchProducts();
  }, []);

  // 🔹 Add item to cart
  const addToCart = async (variantId) => {
    if (!cartId) return;

    const mutation = `
      mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            lines(first: 10) {
              edges {
                node {
                  id
                  merchandise {
                    ... on ProductVariant {
                      title
                    }
                  }
                  quantity
                }
              }
            }
          }
        }
      }
    `;
    await shopify(mutation, {
      cartId,
      lines: [{ merchandiseId: variantId, quantity: 1 }],
    });

    alert("✅ Item added to cart!");
  };

  // 🔹 Redirect to Shopify checkout
  const checkout = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  };

  return (

    
<div className="product-grid">
  {products.map(({ node }) => (
    <div key={node.id} className="product-card">
      {node.images.edges.length > 0 && (
        <img
          src={node.images.edges[0].node.src}
          alt={node.images.edges[0].node.altText || node.title}
        />
      )}
      <h2 className="text-lg font-semibold mb-1">{node.title}</h2>
     <p className="product-desc">
  {node.description}
</p>

      <p className="text-green-700 font-bold mb-3">
        {node.variants.edges[0].node.price.amount}{" "}
        {node.variants.edges[0].node.price.currencyCode}
      </p>

      <div className="actions">
        <button
          onClick={() => addToCart(node.variants.edges[0].node.id)}
          className="btn"
        >
          Add to Cart
        </button>
      </div>
    </div>
  ))}
</div>

 

  );
}

export default App;
