// Navigation metadata only. No domain services or private workspace data.
export const workspaceViews = {
  'learning': [
    ['today', 'قراءتي اليوم', 'Reading today'],
    ['library', 'المكتبة', 'Library'],
    ['notes', 'الملاحظات والأفكار', 'Notes & ideas'],
    ['maps', 'خرائط المعرفة', 'Knowledge maps'],
    ['practice', 'التطبيق والمراجعة', 'Application & review'],
    ['progress', 'التقدم والحصيلة', 'Progress & outcomes'],
  ],
  'strategic-relationships': [
    ['today', 'المتابعة اليوم', 'Today & follow-up'],
    ['people', 'الأشخاص والجهات', 'People & organizations'],
    ['strategy', 'استراتيجية العلاقات', 'Relationship strategy'],
    ['network', 'خريطة الشبكة وتحليلها', 'Network & analysis'],
    ['events', 'اللقاءات والأحداث', 'Meetings & events'],
    ['collaborations', 'التعاون والشراكات', 'Collaboration & alliances'],
    ['reviews', 'المراجعة والنتائج', 'Reviews & outcomes'],
    ['learning', 'التعلّم والممارسة', 'Learning & practice'],
  ],
  'founder-workspace': [
    ['overview', 'الصورة الكبيرة', 'The big picture'],
    ['loop', 'حلقة الممارسة', 'Practice loop'],
    ['timeline', 'الجدول الزمني', 'Timeline'],
    ['today', 'اليوم والدورة', 'Today & cycle'],
    ['review', 'المراجعة والأدلة', 'Reviews & evidence'],
  ],
} as const;
export type WorkspaceName = keyof typeof workspaceViews;
