import { useState, useRef } from "react";

export default function App() {
  const [wine, setWine] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [inventory, setInventory] = useState([]);
  const [mode, setMode] = useState("home");
  const [photo, setPhoto] = useState(null);
  const fileInput = useRef(null);

  function handlePhoto(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      setPhoto(ev.target.result);
      setWine("(wine name will come from AI)");
      setQuantity(1);
    };
    reader.readAsDataURL(file);
  }

  function openCamera() {
    fileInput.current.click();
  }

  function handleAdd() {
    if (!wine) return;
    setInventory(function(prev) {
      var found = false;
      var updated = prev.map(function(item) {
        if (item.name === wine) {
          found = true;
          return { name: item.name, qty: item.qty + quantity };
        }
        return item;
      });
      if (!found) {
        updated.push({ name: wine, qty: quantity });
      }
      return updated;
    });
    resetScan();
  }

  function handleDrink() {
    if (!wine) return;
    setInventory(function(prev) {
      return prev.map(function(item) {
        if (item.name === wine) {
          return { name: item.name, qty: Math.max(item.qty - quantity, 0) };
        }
        return item;
      }).filter(function(item) { return item.qty > 0; });
    });
    resetScan();
  }

  function resetScan() {
    setWine(null);
    setPhoto(null);
    setQuantity(1);
    setMode("home");
    if (fileInput.current) fileInput.current.value = "";
  }

  if (mode === "home") {
    return (
      <div style={pageStyle}>
        <h1>Wine Agent</h1>
        <button onClick={function() { setMode("scan"); }} style={btnStyle}>
          Scan - Add Bottle
        </button>
        <br /><br />
        <button onClick={function() { setMode("drink"); }} style={btnStyle}>
          Drink Bottle
        </button>
        <br /><br />
        <button onClick={function() { setMode("dashboard"); }} style={btnStyle}>
          Dashboard
        </button>
      </div>
    );
  }

  if (mode === "scan" || mode === "drink") {
    return (
      <div style={pageStyle}>
        <h1>{mode === "scan" ? "Scan - Add" : "Drink"}</h1>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInput}
          onChange={handlePhoto}
          style={{ display: "none" }}
        />

        {!wine && (
          <button onClick={openCamera} style={btnStyle}>
            Open Camera
          </button>
        )}

        {photo && (
          <div>
            <img src={photo} alt="scanned" style={{ maxWidth: "100%", borderRadius: 8, marginTop: 10 }} />
          </div>
        )}

        {wine && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 20 }}><b>{wine}</b></p>
            <label>Quantity: </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={function(e) { setQuantity(Number(e.target.value)); }}
              style={{ fontSize: 18, width: 60, textAlign: "center" }}
            />
            <br /><br />
            {mode === "scan" && (
              <button onClick={handleAdd} style={btnGreen}>
                Add to Inventory
              </button>
            )}
            {mode === "drink" && (
              <button onClick={handleDrink} style={btnRed}>
                Drink
              </button>
            )}
          </div>
        )}

        <br />
        <button onClick={resetScan} style={btnStyle}>
          Back
        </button>
      </div>
    );
  }

  if (mode === "dashboard") {
    var total = inventory.reduce(function(sum, item) { return sum + item.qty; }, 0);
    return (
      <div style={pageStyle}>
        <h1>Dashboard</h1>
        <p>Total bottles: <b>{total}</b></p>
        <hr />
        {inventory.length === 0 && <p>No bottles yet</p>}
        {inventory.map(function(item) {
          return (
            <div key={item.name} style={{ padding: 8, borderBottom: "1px solid #ccc" }}>
              <b>{item.name}</b> - {item.qty} bottles
            </div>
          );
        })}
        <br />
        <button onClick={function() { setMode("home"); }} style={btnStyle}>
          Back
        </button>
      </div>
    );
  }

  return null;
}

var pageStyle = { padding: 20, fontFamily: "Arial", maxWidth: 500 };

var btnStyle = {
  padding: "12px 24px",
  fontSize: 16,
  borderRadius: 8,
  border: "2px solid #333",
  background: "#fff",
  cursor: "pointer"
};

var btnGreen = {
  padding: "12px 24px",
  fontSize: 16,
  borderRadius: 8,
  border: "none",
  background: "#2d8a4e",
  color: "#fff",
  cursor: "pointer"
};

var btnRed = {
  padding: "12px 24px",
  fontSize: 16,
  borderRadius: 8,
  border: "none",
  background: "#c0392b",
  color: "#fff",
  cursor: "pointer"
};