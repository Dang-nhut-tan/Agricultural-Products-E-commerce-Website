class BannerRespone {
  constructor(banner) {
    const data = banner?.toJSON ? banner.toJSON() : banner;

    this.id = data.id;
    this.name = data.name;
    this.image = data.image;
    this.status = data.status;
    this.sort_order = data.sort_order;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    if (data.BannerDetails !== undefined) {
      this.BannerDetails = data.BannerDetails;
    }
  }
}

module.exports = BannerRespone;
