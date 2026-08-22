class Booking {
    constructor(id, user_id, service_type, project_description, status, created_at) {
        this.id = id;
        this.user_id = user_id;
        this.service_type = service_type;
        this.project_description = project_description;
        this.status = status;
        this.created_at = created_at;
    }
}

module.exports = Booking;