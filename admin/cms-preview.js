CMS.registerPreviewTemplate("events", ({ entry }) => {
    const data = entry.get("data").toJS();
    return `
      <div style="background:#111; color:white; font-family:sans-serif; padding:16px; max-width:960px">
        <img src="${data.image}" style="width:100%; border: 4px solid ${data.borderColor || '#ff6600'}; border-radius: 8px;" />
        <h2>${data.title}</h2>
        <p>${new Date(data.date).toLocaleString()}</p>
        ${data.end ? `<p>Ends: ${new Date(data.end).toLocaleString()}</p>` : ""}
      </div>
    `;
  });
  