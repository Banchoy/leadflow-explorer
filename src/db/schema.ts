import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const leadStatusEnum = pgEnum('lead_status', ['Pendente', 'Contatado', 'Qualificado', 'Desqualificado']);
export const priorityEnum = pgEnum('priority', ['Alta', 'Média', 'Baixa']);

export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  companyName: text('company_name').notNull(),
  address: text('address'),
  website: text('website'),
  phone: text('phone'),
  email: text('email'),
  instagram: text('instagram'),
  status: leadStatusEnum('status').default('Pendente').notNull(),
  priority: priorityEnum('priority').default('Média'),
  userId: text('user_id').notNull(), // associated to Clerk user id
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
