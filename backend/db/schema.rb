# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_08_31_052819) do
  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "follows", force: :cascade do |t|
    t.integer "follower_id", null: false
    t.integer "followed_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["followed_id"], name: "index_follows_on_followed_id"
    t.index ["follower_id", "followed_id"], name: "index_follows_on_follower_id_and_followed_id", unique: true
    t.index ["follower_id"], name: "index_follows_on_follower_id"
  end

  create_table "patreon_tiers", force: :cascade do |t|
    t.string "patreon_tier_id", null: false
    t.string "name", null: false
    t.text "description"
    t.integer "amount_cents", null: false
    t.boolean "published"
    t.string "image_url"
    t.integer "book_sync_limit", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["patreon_tier_id"], name: "index_patreon_tiers_on_patreon_tier_id", unique: true
  end

  create_table "reading_sessions", force: :cascade do |t|
    t.integer "snowflake", null: false
    t.integer "user_id", null: false
    t.string "book_id", null: false
    t.string "book_title", null: false
    t.string "book_language", null: false
    t.datetime "start_time", null: false
    t.datetime "end_time"
    t.integer "initial_chars", null: false
    t.integer "curr_chars", default: 0, null: false
    t.integer "total_reading_time", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["start_time"], name: "index_reading_sessions_on_start_time"
    t.index ["user_id", "snowflake"], name: "index_reading_sessions_on_user_id_and_snowflake", unique: true
    t.index ["user_id"], name: "index_reading_sessions_on_user_id"
  end

  create_table "sessions", force: :cascade do |t|
    t.integer "user_id", null: false
    t.string "ip_address"
    t.string "user_agent"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", null: false
    t.string "password_digest", null: false
    t.datetime "email_confirmed_at"
    t.datetime "email_confirmation_sent_at"
    t.datetime "password_reset_at"
    t.datetime "password_reset_mail_sent_at"
    t.string "username", null: false
    t.string "bio"
    t.boolean "share_online_status", default: true, null: false
    t.boolean "share_presence", default: true, null: false
    t.boolean "is_admin", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "following_count", default: 0, null: false
    t.integer "followers_count", default: 0, null: false
    t.string "patreon_id"
    t.string "patreon_access_token"
    t.string "patreon_refresh_token"
    t.datetime "patreon_expires_at"
    t.integer "patreon_tier_id"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["patreon_id"], name: "index_users_on_patreon_id", unique: true
    t.index ["patreon_tier_id"], name: "index_users_on_patreon_tier_id"
    t.index ["username"], name: "index_users_on_username", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "follows", "users", column: "followed_id"
  add_foreign_key "follows", "users", column: "follower_id"
  add_foreign_key "reading_sessions", "users"
  add_foreign_key "sessions", "users"
  add_foreign_key "users", "patreon_tiers"
end
