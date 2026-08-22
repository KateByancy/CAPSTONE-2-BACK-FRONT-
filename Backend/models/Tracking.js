class Tracking {
    constructor(id, booking_id, status, remarks, updated_at) {
        this.id = id;
        this.booking_id = booking_id;
        this.status = status;
        this.remarks = remarks;
        this.updated_at = updated_at;
    }
}

module.exports = Tracking;