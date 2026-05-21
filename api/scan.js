module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    var imageData = req.body.image;
    var mediaType = req.body.mediaType || "image/jpeg";

    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageData
              }
            },
            {
              type: "text",
              text: "This is a wine or spirit bottle label. Return ONLY a JSON object: {\"name\": \"full name\", \"winery\": \"producer\", \"country\": \"country\", \"grape\": \"grape variety\", \"year\": \"vintage\", \"category\": \"red/white/rose/whisky/other\"}. Return ONLY JSON, nothing else."
            }
          ]
        }]
      })
    });

    var data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    var text = data.content[0].text;

    try {
      return res.status(200).json(JSON.parse(text));
    } catch (e) {
      var match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return res.status(200).json(JSON.parse(match[0]));
      }
      return res.status(200).json({ name: text });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};