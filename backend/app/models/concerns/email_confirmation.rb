module EmailConfirmation
  extend ActiveSupport::Concern

  class_methods do
    def has_email_confirmation(expires_in: 24.hours)
      generates_token_for(:email_address_confirmation, expires_in: expires_in)

      def self.find_by_email_confirmation_token(token)
        find_by_token_for(:email_address_confirmation, token)
      end
    end
  end

  def email_confirmation_token
    generate_token_for(:email_address_confirmation)
  end
end
