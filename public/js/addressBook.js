document.addEventListener("DOMContentLoaded", () => {
  // Sidebar Navigation
  const sidebarItems = document.querySelectorAll(".sidebar-menu li");
  const profileSections = document.querySelectorAll(".profile-section");

  sidebarItems.forEach(item => {
    item.addEventListener("click", () => {
      sidebarItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      const target = item.getAttribute("data-target");
      profileSections.forEach(section => {
        section.classList.add("hidden");
      });
      document.getElementById(target).classList.remove("hidden");
    });
  });

  // ===================== Address Book ======================
  const addAddressBtn = document.getElementById("add-address-btn");
  const addressModal = document.getElementById("address-modal");
  const addressForm = document.getElementById("address-form");
  const cancelModalBtn = document.getElementById("cancel-address-btn");

  let editingAddressId = null;

  // Open modal for new address
  addAddressBtn?.addEventListener("click", () => {
    editingAddressId = null;
    addressForm.reset();
    addressModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";  // 🔒 Prevent background scroll
  });

  // Cancel button inside modal
  cancelModalBtn?.addEventListener("click", () => {
    addressModal.classList.add("hidden");
    document.body.style.overflow = ""; // ✅ Restore scroll
  });

  // Edit button on address card
  document.querySelectorAll(".edit-address-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const addressData = JSON.parse(btn.getAttribute("data-address"));
      editingAddressId = addressData.id;

      addressForm.elements["address_type"].value = addressData.address_type;
      addressForm.elements["full_name"].value = addressData.full_name;
      addressForm.elements["address_line1"].value = addressData.address_line1;
      addressForm.elements["address_line2"].value = addressData.address_line2;
      addressForm.elements["city"].value = addressData.city;
      addressForm.elements["state"].value = addressData.state;
      addressForm.elements["postal_code"].value = addressData.postal_code;
      addressForm.elements["country"].value = addressData.country;

      addressModal.classList.remove("hidden");
      document.body.style.overflow = 'hidden';
    });
  });

  // Delete button
  document.querySelectorAll(".delete-address-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const addressId = btn.getAttribute("data-id");
      if (!confirm("Are you sure you want to delete this address?")) return;

      try {
        const res = await fetch(`/profile/address/delete/${addressId}`, {
          method: "DELETE"
        });
        const data = await res.json();
        if (data.success) {
          location.reload();
        } else {
          alert(data.message || "Failed to delete address.");
        }
      } catch (err) {
        console.error("Delete error:", err);
      }
    });
  });

  // Set default button
  document.querySelectorAll(".set-default-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const addressId = btn.getAttribute("data-id");
      try {
        const res = await fetch(`/profile/address/set-default/${addressId}`, {
          method: "PATCH"
        });
        const data = await res.json();
        if (data.success) {
          location.reload();
        } else {
          alert(data.message || "Failed to set default address.");
        }
      } catch (err) {
        console.error("Set default error:", err);
      }
    });
  });

  // Submit add/edit address form
  addressForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(addressForm);
    const payload = Object.fromEntries(formData.entries());

    const url = editingAddressId
      ? `/profile/address/edit/${editingAddressId}`
      : `/profile/address/add`;

    const method = editingAddressId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        addressModal.classList.add("hidden");
        location.reload();
      } else {
        alert(result.message || "Something went wrong.");
      }
    } catch (err) {
      console.error("Address form error:", err);
    }
  });
});

