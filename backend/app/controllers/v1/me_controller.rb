class V1::MeController < ApplicationController
  def show
    render_success data: UserBlueprint.render_as_json(Current.user, view: :show)
  end

  def update
    if Current.user.update(user_update_params)
      render_success data: UserBlueprint.render_as_json(Current.user, view: :show)
    else
      render_error errors: Current.user.errors.full_messages
    end
  end

  def avatar
    unless params[:avatar].present?
      return render_error errors: "Missing avatar file."
    end

    if params[:avatar].size > 2.megabytes
      return render_error errors: "Avatar is too big (max 2MB)."
    end

    if Current.user.avatar.attached?
      Current.user.avatar.purge
    end

    Current.user.avatar.attach(params[:avatar])
    if Current.user.avatar.attached?
      avatar_url = url_for(Current.user.avatar)
      render_success data: { avatar_url: avatar_url }, message: "Avatar updated successfully."
    else
      render_error errors: "Avatar upload failed"
    end
  end

  private

  def user_update_params
    params.expect(user: [ :bio, :share_online_status, :share_presence ])
  end
end
