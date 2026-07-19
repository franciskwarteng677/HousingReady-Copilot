export class ObjectUrlRegistry {
  private readonly urls = new Map<string, string>();

  create(documentId: string, file: File): string {
    this.revoke(documentId);
    const url = URL.createObjectURL(file);
    this.urls.set(documentId, url);
    return url;
  }

  get(documentId: string): string | undefined {
    return this.urls.get(documentId);
  }

  revoke(documentId: string): void {
    const url = this.urls.get(documentId);
    if (!url) {
      return;
    }

    URL.revokeObjectURL(url);
    this.urls.delete(documentId);
  }

  revokeAll(): void {
    for (const url of this.urls.values()) {
      URL.revokeObjectURL(url);
    }
    this.urls.clear();
  }

  get size(): number {
    return this.urls.size;
  }
}
