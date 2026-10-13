import { createFileRoute } from "@tanstack/react-router";

import { ArticlesPage } from "@/features/articles/articles-page";

export const Route = createFileRoute("/articles")({
  component: ArticlesPage,
});
