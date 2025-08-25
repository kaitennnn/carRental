// Create and append elements to the document body
document.body.innerHTML = `
  <nav class="navbar">
    <a href="index.html" class="logo">CarRental</a>
    <ul class="nav-links">
      <li><a href="index.html">首頁</a></li>
      <li><a href="cars.html">車輛列表</a></li>
      <li><a href="booking.html">立即預約</a></li>
      <li class="user-menu">
        <a href="#" class="user-icon">
          <i class="fas fa-user"></i>
        </a>
        <ul class="dropdown-menu">
          <li><a href="login.html">Login</a></li>
          <li><a href="register.html">Register</a></li>
        </ul>
      </li>
    </ul>
  </nav>

  <main class="auth-container">
    <div class="auth-form">
      <h2>Member Registration</h2>
      <form id="registration-form">
        <div class="form-group">
          <label for="username">First and Last Name</label>
          <input type="text" id="username" required>
        </div>
        <div class="form-group">
          <label for="contact">Contact Number</label>
          <input type="text" id="contact" required>
        </div>
        <div class="form-group">
          <label for="email">Email Address</label>
          <input type="email" id="email" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" required>
        </div>
        <div class="form-group">
          <label for="confirm-password">Confirm Password</label>
          <input type="password" id="confirm-password" required>
        </div>
        <button type="Submit" class="auth-button">Submit</button>
        <p class="auth-link">Already a Member？ <a href="login.html">Login Here</a></p>
      </form>
    </div>
  </main>

  <footer>
    <p>&copy; 2024 CarRental. All rights reserved.</p>
  </footer>
`;

// Optional: Add form submission logic
document.getElementById('registration-form').addEventListener('Submit', function (e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const contact = document.getElementById('contact').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (password !== confirmPassword) {
    alert('Passwords do not match!');
    return;
  }

  // You can send this data to a backend or log it
  console.log({ username, contact, email, password });
  alert('Registration successful!');
});