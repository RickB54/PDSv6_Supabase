# Photo & Media Management System Guide

## Overview
The application uses a **two-layer photo system** to organize media for customers and their vehicles separately.

---

## 🧑 Layer 1: Customer Profile Media
**Location:** Top section of Customer/Prospect editor  
**Label:** "GENERAL PROFILE MEDIA" (Account Level)

### What Goes Here?
- Customer headshots
- ID photos
- Profile pictures
- Any photos of the person themselves

### Categories
1. **PROFILE / GENERAL** - General customer photos
2. **MISC BEFORE** - Photos before working with your company
3. **MISC AFTER** - Photos showing results/after service

### Storage
- Saved to `customers` table in Supabase
- Columns: `general_photos`, `before_photos`, `after_photos`
- Persists even if customer doesn't have a vehicle

---

## 🚗 Layer 2: Vehicle-Specific Media
**Location:** Bottom section of Customer/Prospect editor  
**Label:** "VEHICLE-SPECIFIC MEDIA"

### What Goes Here?
- Before/After detailing photos
- Vehicle condition documentation
- Damage photos
- General car photos

### Categories (per vehicle)
1. **BEFORE PHOTO** - Vehicle condition before service
2. **AFTER PHOTO** - Vehicle condition after detailing
3. **GENERAL PHOTO** - General vehicle photos

### Storage
- Saved to `vehicles` table in Supabase
- Columns: `general_photos`, `before_photos`, `after_photos`
- Each vehicle has its own independent photo gallery
- Linked to customer via `customer_id`

---

## 📂 Media Library (Vehicle Gallery)
**Access:** Main navigation → "Media Library"

### What You'll See
- **Organized View:** Photos grouped by customer and vehicle
- **All Photos View:** Continuous grid of all media
- **Flat Gallery:** Scrollable view without accordion expansion

### Filtering
- Search by customer name
- Filter by vehicle make/model
- View all photos across all customers and vehicles

### Why Photos Might Not Show
1. **No photos uploaded yet** - Upload photos via Customer/Prospect editor
2. **Photos on different vehicle** - Check other vehicles for the customer
3. **Customer-level photos only** - These appear in the customer section, not vehicle

---

## 🎯 Real-World Example

### Scenario: Serge Michaud with 2 Vehicles

**Customer Profile Media (Top Section):**
- Upload Serge's ID photo → Shows in Media Library under "Serge Michaud (Customer Photos)"

**Vehicle 1: 2020 Toyota Versa**
- Upload "before" dirty car photos
- Upload "after" clean car photos
- Shows in Media Library under "Serge Michaud → Toyota Versa"

**Vehicle 2: 2018 Ram 1500**
- Upload different before/after photos for the Ram
- Shows in Media Library under "Serge Michaud → Ram 1500"

**Result:** 
- Serge's profile has 1 set of customer photos
- Versa has its own photo gallery
- Ram has a separate photo gallery
- All organized by customer in Media Library

---

## 💡 Best Practices

### When to Use Customer Photos
- Customer ID/license for records
- Customer with their vehicle (person visible)
- Profile pictures for identification

### When to Use Vehicle Photos
- Before/after detailing work
- Vehicle condition documentation
- Damage or scratch documentation
- Progress photos during service

### Organizing Tips
1. Always add vehicle first before uploading vehicle photos
2. Use consistent naming for photo categories
3. Upload before photos BEFORE starting work
4. Upload after photos immediately after completion
5. Customer photos are optional but helpful for identification

---

## 🔍 Troubleshooting

**"I uploaded photos but don't see them in Media Library"**
- Hard refresh the page (Ctrl + Shift + R)
- Check that you clicked "Save Prospect" or "Save Customer" after uploading
- Verify photos in the customer editor - they should persist

**"Photos disappeared after saving"**
- Check browser console for errors
- Verify Supabase storage permissions
- Ensure customer_id is correctly linked to vehicle

**"Can't upload photos"**
- Check file size (max 10MB per photo)
- Verify supported formats: JPG, PNG, WebP
- Ensure Supabase storage buckets exist

---

## 📊 Data Flow

```
1. User uploads photo in Customer Editor
   ↓
2. Photo saved to Supabase Storage bucket
   ↓
3. Photo URL saved to database
   - Customer photos → customers.general_photos[]
   - Vehicle photos → vehicles.general_photos[]
   ↓
4. Media Library queries database
   ↓
5. Photos displayed grouped by customer/vehicle
```

---

## 🛠️ Technical Details

### Database Schema

**customers table:**
- `general_photos`: TEXT[] - Customer profile photos
- `before_photos`: TEXT[] - Before working with company
- `after_photos`: TEXT[] - After results

**vehicles table:**
- `general_photos`: TEXT[] - General vehicle photos
- `before_photos`: TEXT[] - Before detailing
- `after_photos`: TEXT[] - After detailing
- `customer_id`: UUID - Links to customer
- `video_urls`: TEXT[] - Video links (YouTube, etc.)

### Storage Buckets
- `customer-photos` - All customer and vehicle photos
- Public access for easy sharing
- Organized by customer ID and vehicle ID

---

## 📝 Quick Reference

| Action | Location | Result |
|--------|----------|--------|
| Upload customer photo | Edit Customer → Top section | Shows in customer profile |
| Upload vehicle photo | Edit Customer → Bottom section (per vehicle) | Shows under that vehicle |
| View all photos | Media Library | Organized by customer and vehicle |
| Search photos | Media Library search bar | Filter by name/vehicle |
| Delete photo | Click X on photo thumbnail | Removes from storage and database |

---

Last Updated: January 21, 2026
