import { useState, useRef } from "react";

function resizeImage(dataUrl, maxWidth, callback) {
  var img = new Image();
  img.onload = function() {
    var canvas = document.createElement("canvas");
    var scale = maxWidth / img.width;
    if (img.width <= maxWidth) scale = 1;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    var resized = canvas.toDataURL("image/jpeg", 0.7);
    callback(resized);
  };
  img.src = dataUrl;
}

export default function App() {
  const [wine, setWine] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [inventory, setInventory] = useState([]);
  const [mode, setMode] = useState("home");
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef(null);

  function handlePhoto(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var fullData = ev.target.result;
      resizeImage(fullData, 800, function(resized) {
        setPhoto(resized);
        var base64 = resized.split(",")[1];
        sendToAI(base64);
      });
    };
    reader.readAsDataURL(file);
  }

  function sendToAI(base64) {
    setLoading(true);
    setWine(null);
    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, mediaType: "image/jpeg" })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error) {
        alert("AI Error: " + data.error);
        setLoading(false);
        return;
      }
      setWine(data);
      setQuantity(1);
      setLoading(false);
    })
    .catch(function(err) {
      alert("Network Error: " + err.message);
      setLoading(false);
    });
  }

  function openCamera() {
    fileInput.current.click();
  }

  function getWineName() {
    if (!wine) return "";
    if (wine.name) return wine.name;
    return JSON.stringify(wine);
  }

  function handleAdd() {
    if (!wine) return;
    var name = getWineName();
    setInventory(function(prev) {
      var found = false;
      var updated = prev.map(function(item) {
        if (item.name === name) {
          found = true;
          return { name: item.name, qty: item.qty + quantity, details: wine };
        }
        return item;
      });
      if (!found) {
        updated.push({ name: name, qty: quantity, details: wine });
      }
      return updated;
    });
    resetScan();
  }

  function handleDrink() {
    if (!wine) return;
    var name = getWineName();
    setInventory(function(prev) {
      return prev.map(function(item) {
        if (item.name === name) {
          return { name: item.name, qty: Math.max(item.qty - quantity, 0), details: item.details };
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
    setLoading(false);
    setMode("home");
    if (fileInput.current) fileInput.current.value = "";
  }

  if (mode === "home") {
    return (
      <div style={pageStyle}>
        <h1>Wine Agent</h1>
        <button onClick={function() { setMode("scan"); }} style={btnStyle}>Scan - Add Bottle</button>
        <br /><br />
        <button onClick={function() { setMode("drink"); }} style={btnStyle}>Drink Bottle</button>
        <br /><br />
        <button onClick={function() { setMode("dashboard"); }} style={btnStyle}>Dashboard</button>
      </div>
    );
  }

  if (mode === "scan" || mode === "drink") {
    return (
      <div style={pageStyle}>
        <h1>{mode === "scan" ? "Scan - Add" : "Drink"}</h1>
        <input type="file" accept="image/*" capture="environment" ref={fileInput} onChange={handlePhoto} style={{ display: "none" }} />
        {!wine && !loading && (
          <button onClick={openCamera} style={btnStyle}>Open Camera</button>
        )}
        {loading && <p style={{ fontSize: 18 }}>Identifying wine...</p>}
        {photo && <img src={photo} style={{ maxWidth: "100%", borderRadius: 8, marginTop: 10 }} />}
        {wine && (
          <div style={{ marginTop: 16, background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
            <p style={{ fontSize: 20 }}><b>{wine.name || "Unknown"}</b></p>
            {wine.winery && <p>Winery: {wine.winery}</p>}
            {wine.country && <p>Country: {wine.country}</p>}
            {wine.grape && <p>Grape: {wine.grape}</p>}
            {wine.year && <p>Year: {wine.year}</p>}
            {wine.category && <p>Category: {wine.category}</p>}
            <br />
            <label>Quantity: </label>
            <input type="number" min="1" value={quantity} onChange={function(e) { setQuantity(Number(e.target.value)); }} style={{ fontSize: 18, width: 60, textAlign: "center" }} />
            <br /><br />
            {mode === "scan" && <button onClick={handleAdd} style={btnGreen}>Add to Inventory</button>}
            {mode === "drink" && <button onClick={handleDrink} style={btnRed}>Drink</button>}
          </div>
        )}
        <br />
        <button onClick={resetScan} style={btnStyle}>Back</button>
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
            <div key={item.name} style={{ padding: 10, borderBottom: "1px solid #ccc" }}>
              <b>{item.name}</b> - {item.qty} bottles
              {item.details && item.details.country && <span style={{ color: "#888" }}> ({item.details.country})</span>}
            </div>
          );
        })}
        <br />
        <button onClick={function() { setMode("home"); }} style={btnStyle}>Back</button>
      </div>
    );
  }

  return null;
}

var pageStyle = { padding: 20, fontFamily: "Arial", maxWidth: 500 };
var btnStyle = { padding: "12px 24px", fontSize: 16, borderRadius: 8, border: "2px solid #333", background: "#fff", cursor: "pointer" };
var btnGreen = { padding: "12px 24px", fontSize: 16, borderRadius: 8, border: "none", background: "#2d8a4e", color: "#fff", cursor: "pointer" };
var btnRed = { padding: "12px 24px", fontSize: 16, borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer" };