namespace :patreon do
  desc "Sync Patreon tiers into the database"
  task sync_tiers: :environment do
    puts "Fetching tiers from Patreon..."

    data = PatreonService.fetch_tiers
    tiers = data["included"].select { |t| t["type"] == "tier" }

    tiers.each do |tier|
      attributes = tier["attributes"]
      record = PatreonTier.find_or_initialize_by(patreon_tier_id: tier["id"])
      record.update!(
        name: attributes["title"],
        description: attributes["description"].present? ? ActionView::Base.full_sanitizer.sanitize(attributes["description"]) : nil,
        amount_cents: attributes["amount_cents"].to_i,
        published: attributes["published"],
        image_url: attributes["image_url"]
      )

      puts "✅ Synced tier: #{record.name} (#{record.amount_cents / 100.0}$)"
    end

    puts "All tiers synced!"
  end
end
