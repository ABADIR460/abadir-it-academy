const API = "https://abadir-it-academy-backend.onrender.com";

async function loadMaterials() {
  const container = document.getElementById("materialsList");

  try {
    const response = await fetch(API + "/api/materials");
    const data = await response.json();

    if (!response.ok) {
      throw new Error("Could not load materials");
    }

    if (!data.length) {
      container.textContent = "No learning materials available.";
      return;
    }

    container.innerHTML = data.map(item => {
      const card = document.createElement("div");
      card.className = "section";

      const title = document.createElement("h3");
      title.textContent = item.title;

      const description = document.createElement("p");
      description.textContent = item.description || "";

      card.append(title, description);

      const link = document.createElement("a");
      link.target = "_blank";
      link.rel = "noopener";

      if (item.material_type === "youtube") {
        link.href = item.youtube_url;
        link.textContent = "Watch on YouTube";
      } else {
        link.href = item.file_url;
        link.textContent = item.material_type === "pdf"
          ? "Open PDF Notes"
          : "Watch Video";
      }

      card.appendChild(link);
      return card.outerHTML;
    }).join("");

  } catch (error) {
    container.textContent = "Unable to load materials. Please try again.";
  }
}

loadMaterials();
