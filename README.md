# Vijjies-Mart

# 🥬 VIJJIES-MART

### Fresh Vegetables. Easy Ordering. Fast Delivery.

VIJJIES-MART is a full-stack online vegetable delivery platform designed to make purchasing fresh vegetables simple, convenient, and reliable.

Customers can browse fresh vegetables, add products to their cart, choose a delivery address, place orders, and make payments online or through Cash on Delivery.

The platform also provides dedicated dashboards for administrators and delivery partners to manage products, orders, deliveries, and customers.

---

## 🚀 Features

### 👤 Customer Portal

- 🔐 Customer authentication
- 🥦 Browse fresh vegetables
- 🔎 Product browsing and selection
- 🛒 Add products to cart
- ⚖️ Select vegetable quantities
- 📍 Customer delivery location
- 📦 Track order status
- 💳 Online payment using Razorpay
- 💵 Cash on Delivery (COD)
- 🧾 Generate/download invoices
- 🎙️ Voice Shopping Assistant
- 🌐 Multilingual voice interaction
- 📱 Responsive customer interface

### 🎙️ Voice Shopping Assistant

VIJJIES-MART includes a voice-based shopping assistant that allows customers to order vegetables using natural speech.

For example:

> "Tomato 1 kg, brinjal half kg and onion 500 grams."

The assistant can:

1. 🎤 Listen to the customer's voice
2. 📝 Convert speech into text
3. 🧠 Understand product names and quantities
4. 🔍 Match products with the live product catalog
5. 📦 Check product availability and stock
6. 💰 Calculate the order value
7. 📋 Display the order summary
8. ✅ Ask the customer for confirmation
9. 🛒 Add confirmed products to the existing cart
10. 💳 Continue through the existing checkout process

The assistant does not automatically make payments. The customer retains control over the final payment/order confirmation.

---

## 👨‍💼 Admin Dashboard

The admin dashboard allows administrators to manage the platform from a centralized interface.

### Product Management

- ➕ Add new vegetables
- ✏️ Edit products
- 🗑️ Delete products
- 💰 Manage price per kilogram
- 📦 Manage product stock
- 🖼️ Upload product images
- 🔄 Update product information

### Order Management

- 📋 View customer orders
- 🔎 View order details
- 📦 Monitor order status
- 🚚 Assign delivery partners
- 📍 View customer/delivery locations
- 🧾 Generate invoices

### Delivery Management

- 👨‍🚚 View available delivery partners
- 📦 Assign orders
- 📍 Monitor delivery information
- 🔄 Track delivery status

---

## 🚚 Delivery Partner Dashboard

Delivery partners have a dedicated dashboard for managing assigned deliveries.

Features include:

- 📋 View assigned orders
- 📦 Accept/manage deliveries
- 🔄 Update delivery status
- 📍 Live location support
- 🚚 Delivery workflow management
- 📱 Mobile-friendly interface

---

## 💳 Payment System

VIJJIES-MART supports multiple payment options:

### Online Payment

Powered by **Razorpay** for secure online transactions.

### Cash on Delivery

Customers can also choose Cash on Delivery during checkout.

The existing checkout and payment flow is reused by the voice shopping assistant rather than creating a separate payment system.

---

## 🧾 Invoice System

After placing an order, customers can generate/download an invoice containing important order information such as:

- Customer details
- Ordered products
- Quantities
- Price per kilogram
- Total amount
- Order information

---

## 🗺️ Location & Delivery

VIJJIES-MART integrates location functionality to support delivery operations.

The platform can work with:

- 📍 Customer location
- 🚚 Delivery partner location
- 🗺️ Map-based location information
- 📦 Delivery assignment

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │     CUSTOMER        │
                    │                     │
                    │ Web / Mobile UI     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Voice Assistant    │
                    │  Product Selection  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     CART SYSTEM     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      CHECKOUT       │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             ┌─────────────┐       ┌─────────────┐
             │   RAZORPAY  │       │     COD     │
             │   PAYMENT   │       │   PAYMENT   │
             └─────────────┘       └─────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       ORDERS        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ DELIVERY PARTNER    │
                    │     DASHBOARD       │
                    └─────────────────────┘
