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
  var [mode, setMode] = useState("home");
  var [photo, setPhoto] = useState(null);
  var [loading, setLoading] = useState(false);
  var [quantity, setQuantity] = useState(1);
  var [inventory, setInventory] = useState([]);
  var [stats, setStats] = useState(null);
  var [detected, setDetected] = useState(false);
  var [editName, setEditName] = useState("");
  var [editWinery, setEditWinery] = useState("");
  var [editCountry, setEditCountry] = useState("");
  var [editGrape, setEditGrape] = useState("");
  var [editYear, setEditYear] = useState("");
  var [editCategory, setEditCategory] = useState("");
  var [ratingName, setRatingName] = useState("");
  var [ratingScore, setRatingScore] = useState(0);
  var [ratingNotes, setRatingNotes] = useState("");
var [dashData, setDashData] = useState(null);
  var [search, setSearch] = useState("");
  var fileInput = useRef(null);

  function loadInventory() {
    fetch(API + "/inventory").then(function(r) { return r.json(); }).then(setInventory);
  }

  function loadStats() {
function loadDashboard() {
    fetch(API + "/dashboard").then(function(r) { return r.json(); }).then(setDashData);
  }
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
        setDetected(false);
        fetch(API + "/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: resized.split(",")[1], mediaType: "image/jpeg" })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          setEditName(data.name || "");
          setEditWinery(data.winery || "");
          setEditCountry(data.country || "");
          setEditGrape(data.grape || "");
          setEditYear(data.year || "");
          setEditCategory(data.category || "");
          setQuantity(1);
          setDetected(true);
          setLoading(false);
        })
        .catch(function(err) { alert("Error: " + err.message); setLoading(false); });
      });
    };
    reader.readAsDataURL(file);
  }

  function handleAdd() {
    if (!editName) return;
    setLoading(true);
    fetch(API + "/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName, winery: editWinery, category: editCategory,
        country: editCountry, grape: editGrape, quantity: quantity
      })
    })
    .then(function() { resetScan(); loadInventory(); loadStats(); })
    .catch(function(err) { alert("Error: " + err.message); setLoading(false); });
  }

  function handleDrink() {
    if (!editName) return;
    setLoading(true);
    fetch(API + "/drink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, quantity: quantity })
    })
    .then(function() {
      setRatingName(editName);
      setRatingScore(0);
      setRatingNotes("");
      setPhoto(null); setDetected(false); setLoading(false);
      setMode("rate");
      loadInventory(); loadStats();
    })
    .catch(function(err) { alert("Error: " + err.message); setLoading(false); });
  }

  function handleRate() {
    if (ratingScore < 1) return;
    fetch(API + "/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ratingName, rating: ratingScore, notes: ratingNotes })
    })
    .then(function() { setMode("home"); loadStats(); })
    .catch(function(err) { alert("Error: " + err.message); });
  }

  function skipRating() {
    setMode("home"); loadStats();
  }

  function startRateFromDashboard(name) {
    setRatingName(name);
    setRatingScore(0);
    setRatingNotes("");
    setMode("rate");
  }

  function resetScan() {
    setPhoto(null); setLoading(false); setDetected(false); setQuantity(1);
    setEditName(""); setEditWinery(""); setEditCountry("");
    setEditGrape(""); setEditYear(""); setEditCategory("");
    setMode("home");
    if (fileInput.current) fileInput.current.value = "";
  }

  if (mode === "home") {
    return (
      <div style={pageStyle}>
        <h1 style={{ fontSize: 28, textAlign: "center" }}>Wine Agent</h1>
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
            <div style={statItemLast}>
              <span style={statNum}>{stats.ratings && stats.ratings.avg_rating ? stats.ratings.avg_rating.toFixed(1) : "\u2014"}</span>
              <span style={statLabel}>Avg Rating</span>
            </div>
          </div>
        )}
        <button onClick={function() { setMode("scan"); }} style={btnPrimary}>Scan - Add Bottle</button>
        <button onClick={function() { setMode("drink"); }} style={btnSecondary}>Drink Bottle</button>
        <button onClick={function() { setMode("dashboard"); loadDashboard(); }} style={btnSecondary}>Dashboard</button>
      </div>
    );
  }

  if (mode === "scan" || mode === "drink") {
    return (
      <div style={pageStyle}>
        <h1>{mode === "scan" ? "Scan - Add" : "Drink"}</h1>
        <input type="file" accept="image/*" capture="environment" ref={fileInput} onChange={handlePhoto} style={{ display: "none" }} />
        {!detected && !loading && (
          <button onClick={function() { fileInput.current.click(); }} style={btnPrimary}>Open Camera</button>
        )}
        {loading && <p style={{ fontSize: 18, color: "#666" }}>Identifying wine...</p>}
        {photo && <img src={photo} style={{ maxWidth: "100%", borderRadius: 8, marginTop: 10 }} />}
        {detected && (
          <div style={cardStyle}>
            <div style={fieldRow}><label style={fieldLabel}>Name</label><input type="text" value={editName} onChange={function(e) { setEditName(e.target.value); }} style={fieldInput} /></div>
            <div style={fieldRow}><label style={fieldLabel}>Winery</label><input type="text" value={editWinery} onChange={function(e) { setEditWinery(e.target.value); }} style={fieldInput} /></div>
            <div style={fieldRow}><label style={fieldLabel}>Country</label><input type="text" value={editCountry} onChange={function(e) { setEditCountry(e.target.value); }} style={fieldInput} /></div>
            <div style={fieldRow}><label style={fieldLabel}>Grape</label><input type="text" value={editGrape} onChange={function(e) { setEditGrape(e.target.value); }} style={fieldInput} /></div>
            <div style={fieldRow}><label style={fieldLabel}>Year</label><input type="text" value={editYear} onChange={function(e) { setEditYear(e.target.value); }} style={fieldInput} /></div>
            <div style={fieldRow}><label style={fieldLabel}>Category</label><input type="text" value={editCategory} onChange={function(e) { setEditCategory(e.target.value); }} style={fieldInput} /></div>
            <div style={fieldRow}><label style={fieldLabel}>Quantity</label><input type="number" min="1" value={quantity} onChange={function(e) { setQuantity(Number(e.target.value)); }} style={numInput} /></div>
            <div style={{ marginTop: 16 }}>
              {mode === "scan" && <button onClick={handleAdd} style={btnGreen}>Add to Inventory</button>}
              {mode === "drink" && <button onClick={handleDrink} style={btnRed}>Drink</button>}
            </div>
          </div>
        )}
        <button onClick={resetScan} style={btnBack}>Back</button>
      </div>
    );
  }

  if (mode === "rate") {
    return (
      <div style={pageStyle}>
        <h1>Rate Wine</h1>
        <div style={cardStyle}>
          <p style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>{ratingName}</p>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>Tap to rate:</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(function(n) {
              return (
                <button key={n} onClick={function() { setRatingScore(n); }} style={{
                  width: 40, height: 40, borderRadius: 20, border: "none", fontSize: 16, fontWeight: "bold", cursor: "pointer",
                  background: ratingScore === n ? "#2d8a4e" : "#e0e0e0",
                  color: ratingScore === n ? "#fff" : "#333"
                }}>{n}</button>
              );
            })}
          </div>
          {ratingScore > 0 && <p style={{ textAlign: "center", fontSize: 20, fontWeight: "bold", color: "#2d8a4e" }}>Score: {ratingScore}/10</p>}
          <div style={fieldRow}>
            <label style={fieldLabel}>Notes (optional)</label>
            <input type="text" value={ratingNotes} onChange={function(e) { setRatingNotes(e.target.value); }} placeholder="e.g. Fruity, smooth..." style={fieldInput} />
          </div>
          <button onClick={handleRate} style={btnGreen}>Save Rating</button>
          <button onClick={skipRating} style={btnBack}>Skip</button>
        </div>
      </div>
    );
  }

  if (mode === "dashboard") {
    if (!dashData) return <div style={pageStyle}><p>Loading dashboard...</p></div>;

    var totalBottles = dashData.inventory.reduce(function(s, i) { return s + i.qty_in_stock; }, 0);
    var totalSpent = dashData.orders.reduce(function(s, o) { return s + o.total; }, 0);
    var ratedWines = dashData.ratings.filter(function(r) { return r.rating !== null; });
    var avgRating = ratedWines.length > 0 ? (ratedWines.reduce(function(s, r) { return s + r.rating; }, 0) / ratedWines.length).toFixed(1) : "\u2014";
    var maxCountry = dashData.byCountry.length > 0 ? dashData.byCountry[0].total : 1;
    var maxCategory = dashData.byCategory.length > 0 ? dashData.byCategory[0].total : 1;

    var filtered = dashData.inventory;
    if (search) {
      var q = search.toLowerCase();
      filtered = dashData.inventory.filter(function(item) {
        return item.name.toLowerCase().indexOf(q) >= 0 || (item.country && item.country.toLowerCase().indexOf(q) >= 0) || (item.winery && item.winery.toLowerCase().indexOf(q) >= 0) || (item.grape && item.grape.toLowerCase().indexOf(q) >= 0);
      });
    }

    return (
      <div style={{ padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ textAlign: "center" }}>Dashboard</h1>

        <div style={statsBox}>
          <div style={statItem}><span style={statNum}>{totalBottles}</span><span style={statLabel}>Bottles</span></div>
          <div style={statItem}><span style={statNum}>{dashData.inventory.length}</span><span style={statLabel}>Wines</span></div>
          <div style={statItem}><span style={statNum}>{dashData.orders.length}</span><span style={statLabel}>Orders</span></div>
          <div style={statItemLast}><span style={statNum}>{avgRating}</span><span style={statLabel}>Avg Rating</span></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={sectionCard}>
            <h3 style={sectionTitle}>By Country</h3>
            {dashData.byCountry.map(function(item, i) {
              var pct = Math.round((item.total / maxCountry) * 100);
              return (
                <div key={item.country} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 2 }}>
                    <span>{item.country || "Unknown"}</span>
                    <span style={{ fontWeight: "bold" }}>{item.total}</span>
                  </div>
                  <div style={{ background: "#eee", borderRadius: 4, height: 14 }}>
                    <div style={{ background: barColors[i % barColors.length], borderRadius: 4, height: 14, width: pct + "%" }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={sectionCard}>
            <h3 style={sectionTitle}>By Category</h3>
            {dashData.byCategory.map(function(item, i) {
              var pct = Math.round((item.total / maxCategory) * 100);
              return (
                <div key={item.category} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 2 }}>
                    <span>{item.category || "Unknown"}</span>
                    <span style={{ fontWeight: "bold" }}>{item.total}</span>
                  </div>
                  <div style={{ background: "#eee", borderRadius: 4, height: 14 }}>
                    <div style={{ background: barColors[i % barColors.length], borderRadius: 4, height: 14, width: pct + "%" }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {dashData.topRated.length > 0 && (
          <div style={sectionCard}>
            <h3 style={sectionTitle}>Top Rated</h3>
            {dashData.topRated.map(function(item) {
              return (
                <div key={item.bottle_name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee", fontSize: 14 }}>
                  <div>
                    <b>{item.bottle_name}</b>
                    {item.country && <span style={{ color: "#888", fontSize: 12 }}> ({item.country})</span>}
                  </div>
                  <span style={{ fontWeight: "bold", color: "#2d8a4e" }}>{item.rating}/10</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={sectionCard}>
          <h3 style={sectionTitle}>Full Inventory</h3>
          <input type="text" value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Search by name, country, winery..." style={{ width: "100%", padding: 10, fontSize: 14, borderRadius: 8, border: "1px solid #ccc", marginBottom: 12, boxSizing: "border-box" }} />
          <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>Showing {filtered.length} of {dashData.inventory.length} wines</p>
          {filtered.map(function(item) {
            return (
              <div key={item.id} style={rowStyle}>
                <div style={{ flex: 1 }}>
                  <b>{item.name}</b>
                  <span style={{ color: "#888", fontSize: 13 }}> ({item.country})</span>
                  <div style={{ fontSize: 12, color: "#999" }}>{item.winery} | {item.grape}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={function() { startRateFromDashboard(item.name); }} style={rateBtn}>⭐</button>
                  <div style={qtyBadge}>{item.qty_in_stock}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={function() { setMode("home"); loadStats(); }} style={btnBack}>Back</button>
      </div>
    );
  }
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={function() { startRateFromDashboard(item.name); }} style={rateBtn}>⭐</button>
                <div style={qtyBadge}>{item.qty_in_stock}</div>
              </div>
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
var statItemLast = { textAlign: "center" };
var statNum = { display: "block", fontSize: 28, fontWeight: "bold", color: "#2d8a4e", marginBottom: 4 };
var statLabel = { display: "block", fontSize: 12, color: "#888", fontWeight: "bold" };
var btnPrimary = { display: "block", width: "100%", padding: "14px", fontSize: 16, borderRadius: 10, border: "none", background: "#2d8a4e", color: "#fff", cursor: "pointer", marginBottom: 10, fontWeight: "bold" };
var btnSecondary = { display: "block", width: "100%", padding: "14px", fontSize: 16, borderRadius: 10, border: "2px solid #333", background: "#fff", cursor: "pointer", marginBottom: 10 };
var btnGreen = { padding: "12px 24px", fontSize: 16, borderRadius: 8, border: "none", background: "#2d8a4e", color: "#fff", cursor: "pointer", fontWeight: "bold", width: "100%" };
var btnRed = { padding: "12px 24px", fontSize: 16, borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontWeight: "bold", width: "100%" };
var btnBack = { display: "block", width: "100%", padding: "12px", fontSize: 14, borderRadius: 8, border: "1px solid #ccc", background: "#f9f9f9", cursor: "pointer", marginTop: 16 };
var cardStyle = { background: "#f9f9f9", padding: 16, borderRadius: 10, marginTop: 12, border: "1px solid #eee" };
var fieldRow = { marginBottom: 10 };
var fieldLabel = { display: "block", fontSize: 13, fontWeight: "bold", color: "#555", marginBottom: 3 };
var fieldInput = { width: "100%", padding: 8, fontSize: 15, borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box" };
var numInput = { width: 80, padding: 8, fontSize: 16, textAlign: "center", borderRadius: 6, border: "1px solid #ccc" };
var rowStyle = { display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" };
var qtyBadge = { background: "#2d8a4e", color: "#fff", borderRadius: 20, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 14 };
var rateBtn = { background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "4px 8px", fontSize: 16, cursor: "pointer" }
var barColors = ["#2d8a4e","#c0392b","#2980b9","#f39c12","#8e44ad","#1abc9c","#d35400","#34495e","#e74c3c","#27ae60"];
var sectionCard = { background: "#f9f9f9", padding: 16, borderRadius: 10, border: "1px solid #eee", marginBottom: 16 };
var sectionTitle = { fontSize: 16, fontWeight: "bold", marginBottom: 12, color: "#333" };