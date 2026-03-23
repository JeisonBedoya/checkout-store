export class Product {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string,
    public price: number, // in COP cents
    public imageUrl: string,
    public stock: number,
    public category: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  hasStock(quantity: number = 1): boolean {
    return this.stock >= quantity;
  }

  decreaseStock(quantity: number = 1): void {
    if (!this.hasStock(quantity)) {
      throw new Error(`Insufficient stock for product ${this.id}`);
    }
    this.stock -= quantity;
  }
}
