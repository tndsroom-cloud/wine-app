import { useState, useRef, useEffect } from "react";

var API = "https://wine-scan.tnd-sroom.workers.dev";

function resizeImage(dataUrl, maxW, cb) {
  var img = new Image();
  img.onload = function() {
    var c = document.createElement("canvas");
    var s = img.width > maxW ? maxW / img.width : 1;
    c.width = img.width * s;
    c.height = img.height * s;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    cb(c.toDataURL("image/jpeg", 0.7));
  };
  img.src = dataUrl;
}

export default function App() {
  var [wine, setWine] = useState(null);
  var [quantity, setQuantity] = useState(1);
  var [inventory, setInventory] = useState([]);
  var [stats, setStats] = useState(null);
  var [mode, setMode] = useState("home");
  var [photo, setPhoto] = useState(null);
  var [loading, setLoading] = useState(false);
  var fileInput = useRef(null);

  function loadInventory() {
    fetch(API + "/inventory").then(function(r) { return r.json(); }).then(setInventory);
  }

  function loadStats() {
    fetch(API + "/stats").then(function(r) { return r.json(); }).then(setStats);
  }

  useEffect(function() { loadInventory(); loadStats(); }, []);

  function handlePhoto(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      resizeImage(ev.target.result, 800, function(resized) {
        setPhoto(resized);
        setLoading(true);
        setWine(null);
        fetch(API + "/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: resized.split(",")[1], mediaType: "image/jpeg" })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) { setWine(data); setQuantity(1); setLoading(false); })
        .catch(function(err) { alert("Error: " + err.message); setLoading(false); });
      });
    };
    reader.readAsDataURL(file);
  }

  function handleAdd() {
    if (!wine) return;
    setLoading(true);
    fetch(API + "/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: wine.name || "Unknown",
        winery: wine.winery || "",
        category: wine.category || "",
        country: wine.country || "",
        grape: wine.grape || "",
        quantity: quantity
      })
    })
    .then(function() { resetScan(); loadInventory(); loadStats(); })
    .catch(function(err) { alert("Error: " + err.message); setLoading(false); });
  }

  function handleDrink() {
    if (!wine) return;
    setLoading(true);
    fetch(API + "/drink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wine.name || "Unknown", quantity: quantity })
    })
    .then(function() { resetScan(); loadInventory(); loadStats(); })
    .catch(function(err) { alert("Error: " + err.message); setLoading(false); });
  }

  function resetScan() {
    setWine(null); setPhoto(null); setQuantity(1); setLoading(false); setMode("home");
    if (fileInput.current) fileInput.current.value = "";
  }

  if (mode === "home") {
    return (
      <div style={pageStyle}>
        <h1 style={{ fontSize: 28 }}>Wine Agent</h1>
        {stats && (
          <div style={statsBox}>
            <div style={statItem}>
              <span style={statNum}>{stats.inventory ? stats.inventory.total_bottles : 0}</span>
              <span style={statLabel}>Bottles</span>
            </div>
            <div style={statItem}>
              <span style={statNum}>{stats.inventory ? stats.inventory.unique_wines : 0}</span>
              <span style={statLabel}>Wines</span>
            </div>
            <div style={statItem}>
              <span style={statNum}>{stats.orders ? stats.orders.total_orders : 0}</span>
              <span style={statLabel}>Orders</span>
            </div>
            <div style={statItem}>
              <span style={statNum}>{stats.ratings && stats.ratings.avg_rating ? stats.ratings.avg_rating.toFixed(1) : "\u2014"}</span>
              <span style={statLabel}>Avg Rating</span>
            </div>
          </div>
        )}
        <button onClick={function() { setMode("scan"); }} style={btnPrimary}>Scan - Add Bottle</button>
        <button onClick={function() { setMode("drink"); }} style={btnSecondary}>Drink Bottle</button>
        <button onClick={function() { setMode("dashboard"); loadInventory(); }} style={btnSecondary}>Dashboard</button>
      </div>
    );
  }

  if (mode === "scan" || mode === "drink") {
    return (
      <div style={pageStyle}>
        <h1>{mode === "scan" ? "Scan - Add" : "Drink"}</h1>
        <input type="file" accept="image/*" capture="environment" ref={fileInput} onChange={handlePhoto} style={{ display: "none" }} />
        {!wine && !loading && (
          <button onClick={function() { fileInput.current.click(); }} style={btnPrimary}>Open Camera</button>
        )}
        {loading && <p style={{ fontSize: 18, color: "#666" }}>Identifying wine...</p>}
        {photo && <img src={photo} style={{ maxWidth: "100%", borderRadius: 8, marginTop: 10 }} />}
        {wine && (
          <div style={cardStyle}>
            <p style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>{wine.name || "Unknown"}</p>
            {wine.winery && <p style={infoLine}>Winery: {wine.winery}</p>}
            {wine.country && <p style={infoLine}>Country: {wine.country}</p>}
            {wine.grape && <p style={infoLine}>Grape: {wine.grape}</p>}
            {wine.year && <p style={infoLine}>Year: {wine.year}</p>}
            {wine.category && <p style={infoLine}>Category: {wine.category}</p>}
            <div style={{ marginTop: 12 }}>
              <label>Quantity: </label>
              <input type="number" min="1" value={quantity} onChange={function(e) { setQuantity(Number(e.target.value)); }} style={numInput} />
            </div>
            <div style={{ marginTop: 12 }}>
              {mode === "scan" && <button onClick={handleAdd} style={btnGreen}>Add to Inventory</button>}
              {mode === "drink" && <button onClick={handleDrink} style={btnRed}>Drink</button>}
            </div>
          </div>
        )}
        <button onClick={resetScan} style={btnBack}>Back</button>
      </div>
    );
  }

  if (mode === "dashboard") {
    var total = inventory.reduce(function(s, i) { return s + i.qty_in_stock; }, 0);
    return (
      <div style={pageStyle}>
        <h1>Dashboard</h1>
        <p style={{ fontSize: 16, color: "#666" }}>Total: <b>{total}</b> bottles, <b>{inventory.length}</b> wines</p>
        <hr />
        {inventory.length === 0 && <p>No bottles yet</p>}
        {inventory.map(function(item) {
          return (
            <div key={item.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <b>{item.name}</b>
                <span style={{ color: "#888", fontSize: 13 }}> ({item.country})</span>
                <div style={{ fontSize: 12, color: "#999" }}>{item.winery} | {item.grape}</div>
              </div>
              <div style={qtyBadge}>{item.qty_in_stock}</div>
            </div>
          );
        })}
        <button onClick={function() { setMode("home"); loadStats(); }} style={btnBack}>Back</button>
      </div>
    );
  }

  return null;
}

var pageStyle = { padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 500, margin: "0 auto" };
var statsBox = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, background: "#f5f5f5", borderRadius: 12, padding: 20, marginBottom: 20 };
var statItem = { textAlign: "center", borderRight: "1px solid #ddd", paddingRight: 8 };
var statNum = { display: "block", fontSize: 28, fontWeight: "bold", color: "#2d8a4e", marginBottom: 4 };
var statLabel = { display: "block", fontSize: 12, color: "#888", fontWeight: "bold" };
var btnPrimary = { display: "block", width: "100%", padding: "14px", fontSize: 16, borderRadius: 10, border: "none", background: "#2d8a4e", color: "#fff", cursor: "pointer", marginBottom: 10, fontWeight: "bold" };
var btnSecondary = { display: "block", width: "100%", padding: "14px", fontSize: 16, borderRadius: 10, border: "2px solid #333", background: "#fff", cursor: "pointer", marginBottom: 10 };
var btnGreen = { padding: "12px 24px", fontSize: 16, borderRadius: 8, border: "none", background: "#2d8a4e", color: "#fff", cursor: "pointer", fontWeight: "bold" };
var btnRed = { padding: "12px 24px", fontSize: 16, borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontWeight: "bold" };
var btnBack = { display: "block", width: "100%", padding: "12px", fontSize: 14, borderRadius: 8, border: "1px solid #ccc", background: "#f9f9f9", cursor: "pointer", marginTop: 16 };
var cardStyle = { background: "#f9f9f9", padding: 16, borderRadius: 10, marginTop: 12, border: "1px solid #eee" };
var infoLine = { margin: "4px 0", fontSize: 14, color: "#555" };
var numInput = { fontSize: 18, width: 60, textAlign: "center", padding: 4, borderRadius: 6, border: "1px solid #ccc" };
var rowStyle = { display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" };
var qtyBadge = { background: "#2d8a4e", color: "#fff", borderRadius: 20, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 14 };