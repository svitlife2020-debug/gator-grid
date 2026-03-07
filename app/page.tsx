if (tab === "WishlistClaims") {
    var sheet = ss.getSheetByName("WishlistClaims");
    sheet.appendRow([
      e.parameter.itemId,
      e.parameter.claimedBy,
      e.parameter.email || "",
      e.parameter.timestamp
    ]);
    sendNotification(
      "🎁 Wishlist Item Claimed",
      "Item ID: "   + e.parameter.itemId + "\n" +
      "Claimed by: " + e.parameter.claimedBy + "\n" +
      "Email: "     + (e.parameter.email || "—") + "\n" +
      "Time: "      + e.parameter.timestamp
    );
    return json({ success: true });
  }
