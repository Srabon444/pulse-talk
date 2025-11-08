-- CreateIndex
CREATE INDEX "comments_parentId_createdAt_idx" ON "comments"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_createdAt_idx" ON "comments"("createdAt");

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex
CREATE INDEX "likes_commentId_isLike_idx" ON "likes"("commentId", "isLike");

-- CreateIndex
CREATE INDEX "likes_userId_idx" ON "likes"("userId");
