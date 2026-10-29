/** Response body for actions whose only result is a message to show the user. */
export interface MessageResponse {
  message: string;
}

/** One page of a list (`?page=&pageSize=`, docs/api.md: "Lists"). */
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}
