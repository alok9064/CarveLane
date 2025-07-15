document.addEventListener("DOMContentLoaded", () => {

  // On page load, show section based on query param if provided
  const urlParams = new URLSearchParams(window.location.search);
  const sectionToShow = urlParams.get('section');

  if (sectionToShow) {
    const targetItem = document.querySelector(`.sidebar-menu li[data-target="${sectionToShow}"]`);
    const targetSection = document.getElementById(sectionToShow);

    if (targetItem && targetSection) {
      // Remove active class from all sidebar items
      document.querySelectorAll(".sidebar-menu li").forEach(i => i.classList.remove("active"));
      // Hide all profile sections
      document.querySelectorAll(".profile-section").forEach(s => s.classList.add("hidden"));

      // Activate the correct one
      targetItem.classList.add("active");
      targetSection.classList.remove("hidden");
    }
  }


  const menuItems = document.querySelectorAll(".sidebar-menu li");
  const sections = document.querySelectorAll(".profile-section");

  const editBtn = document.getElementById("edit-profile-btn");
  const saveBtn = document.getElementById("save-profile-btn");
  const cancelBtn = document.getElementById("cancel-profile-btn");
  const formInputs = document.querySelectorAll("#personal-info-form input, #personal-info-form textarea");

  // Sidebar navigation
  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      // Toggle active menu item
      menuItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      // Show corresponding section
      const targetId = item.dataset.target;
      sections.forEach(section => {
        section.classList.toggle("hidden", section.id !== targetId);
      });
    });
  });

  // Edit button
  editBtn.addEventListener("click", () => {
    formInputs.forEach(input => input.removeAttribute("readonly"));
    editBtn.classList.add("hidden");
    saveBtn.classList.remove("hidden");
    cancelBtn.classList.remove("hidden");
  });

  // Cancel button
  cancelBtn.addEventListener("click", () => {
    window.location.reload(); // Reload to restore original data
  });

  // Save button
  saveBtn.addEventListener("click", async () => {
    const form = document.getElementById("personal-info-form");
    const formData = new FormData(form);
    const data = {};
    formData.forEach((val, key) => (data[key] = val));

    try {
      const response = await fetch("/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        alert("Profile updated successfully!");
        window.location.reload();
      } else {
        alert(result.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Something went wrong.");
    }
  });
});
