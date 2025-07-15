
document.addEventListener("DOMContentLoaded", () => {
  const step1Section = document.getElementById("step1-form-section");
  const step2Section = document.getElementById("step2-form-section");
  const step3Section = document.getElementById("step3-form-section");

  const step3Form = document.getElementById("step3-form");
//   const passwordInput = document.getElementById("password");
//   const confirmPasswordInput = document.getElementById("confirmPassword");
//   const showPasswordToggle = document.getElementById("show-password-toggle");

  const emailInput = document.getElementById("email");
  const nameInput = document.getElementById("name");

  const sendOtpBtn = document.getElementById("send-otp-btn");
  const verifyOtpBtn = document.getElementById("verify-otp-btn");
  const resendBtn = document.getElementById("resend-btn");
  const timerSpan = document.getElementById("timer");

  const step1Message = document.getElementById("step1-message");
  const step2Message = document.getElementById("step2-message");
  const step3Message = document.getElementById("step3-message");

  const loader = document.getElementById("loader");

  let resendInterval;

  // ===== Step 1: Send OTP =====
  sendOtpBtn.addEventListener("click", async () => {

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    step1Message.textContent = "";

    if (!name || !email) {
      step1Message.textContent = "Please enter both full name and email.";
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        step1Message.textContent = "Please enter a valid email address.";
        return;
    }

    try {
      // Disable button during request
      sendOtpBtn.disabled = true;
      sendOtpBtn.textContent = "Sending...";

      // Show loader
      loader.classList.remove("hidden");

      const response = await fetch("/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const result = await response.json();
      console.log("OTP Response:", result);

      if (result.success === true) {
        // ✅ OTP sent successfully
        step1Section.classList.remove("active");
        step1Section.classList.add("hidden");
        step2Section.classList.remove("hidden");
        step2Section.classList.add("active");

        startResendTimer();
      } else {
        // ❌ Show server error
        step1Message.textContent = result.message || "Something went wrong.";
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      step1Message.textContent = error.message || "Server error: Failed to send OTP.";
    } finally {
         // Re-enable button
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = "Send OTP";
        // Hide loader before showing step 2
        loader.classList.add("hidden");
    }
  });

  // ===== Step 2: Verify OTP =====
  verifyOtpBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const otp = document.getElementById("otp").value.trim();
    step2Message.textContent = "";

    if (!otp) {
      step2Message.textContent = "Please enter the OTP.";
      return;
    }

    try {
      const response = await fetch("/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const result = await response.json();

      if (result.success) {
        // Hide Step 2, show Step 3
        step2Section.classList.remove("active");
        step2Section.classList.add("hidden");
        step3Section.classList.remove("hidden");
        step3Section.classList.add("active");
      } else {
        step2Message.textContent = result.message || "Invalid OTP.";
      }
    } catch (error) {
      console.error("OTP verification failed:", error);
      step2Message.textContent = "Failed to verify OTP.";
    }
  });

  // ===== Resend OTP Logic =====
  function startResendTimer() {
    let timeLeft = 60;
    resendBtn.classList.remove("enabled");
    resendBtn.classList.add("disabled");
    resendBtn.style.cursor = "not-allowed";
    timerSpan.textContent = timeLeft;

    clearInterval(resendInterval);
    resendInterval = setInterval(() => {
      timeLeft--;
      timerSpan.textContent = timeLeft;

      if (timeLeft <= 0) {
        clearInterval(resendInterval);
        resendBtn.classList.remove("disabled");
        resendBtn.classList.add("enabled");
        resendBtn.style.cursor = "pointer";
      }
    }, 1000);
  }

  resendBtn.addEventListener("click", async () => {
    if (!resendBtn.classList.contains("enabled")) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    step2Message.textContent = "";

    try {
      const response = await fetch("/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const result = await response.json();
      if (result.success) {
        step2Message.textContent = "OTP resent!";
        startResendTimer();
      } else {
        step2Message.textContent = result.message || "Failed to resend OTP.";
      }
    } catch (err) {
      console.error("Resend failed:", err);
      step2Message.textContent = "Resend error.";
    }
  });

 
// ====== step 3 confirm password and signup =======

// Show/Hide Password toggle logic
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const showPasswordToggle = document.getElementById("show-password-toggle");

showPasswordToggle?.addEventListener("click", () => {
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = confirmPasswordInput.type = type;
  showPasswordToggle.textContent = type === "password" ? "Show" : "Hide";
});


step3Form.addEventListener("submit", async (e) => {
    e.preventDefault();
    step3Message.textContent = "";

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const email = emailInput.value.trim();
    const name = nameInput.value.trim();

    if (password !== confirmPassword) {
        step3Message.textContent = "Passwords do not match.";
        return;
    }
    try {
      const response = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            name,
            email ,
            password,
            confirmPassword
        }),
      });
      const result = await response.json();

      if(result.success) {
        showSuccessMessage("Account created successfully!", () => {
            window.location.href = "/";
        });
      } else {
        step3Message.textContent = result.message || "Signup failed. Please try again."
      }

    } catch (err) {
        console.error("Signup error: ", err);
        step3Message.textContent = "Network error. Please try again.."
    }
});

// ===== Success Message Function =====
function showSuccessMessage(message, callback) {
    const successDiv = document.createElement("div");
    successDiv.className = "success-message";
    successDiv.innerHTML = `
        <div class="success-content">
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <p>${message}<br>Redirecting to Home page in 5 seconds...</p>
        </div>
    `;
    document.body.appendChild(successDiv);

    // Remove after animation and redirect
    setTimeout(() => {
        successDiv.classList.add("fade-out");
        setTimeout(() => {
            successDiv.remove();
            callback();
        }, 500);
    }, 5000);
}


});
