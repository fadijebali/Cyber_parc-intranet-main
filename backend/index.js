import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'

const app = express()
const port = Number(process.env.PORT || 8080)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const ensureMessagesTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS "Message" (
      id SERIAL PRIMARY KEY,
      "senderCompanyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
      "receiverCompanyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )`
  )
}

const ensureUserSettingsTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS "UserSettings" (
      "userId" INTEGER PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
      notifications JSONB NOT NULL DEFAULT '{}'::jsonb,
      "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )`
  )
}

const ensureAdminCompany = async () => {
  const companyColumns = await getTableColumns('Company')

  if (!companyColumns.has('name')) return

  const existing = await pool.query('SELECT id FROM "Company" WHERE LOWER(name) = LOWER($1) LIMIT 1', ['Admin'])

  if (existing.rows.length) return

  const hasUpdatedAt = companyColumns.has('updatedAt')
  const hasUpdatedAtSnake = companyColumns.has('updated_at')

  const columns = ['name']
  const values = ['Admin']
  const placeholders = ['$1']

  if (hasUpdatedAt) {
    columns.push('"updatedAt"')
    values.push(new Date())
    placeholders.push(`$${values.length}`)
  } else if (hasUpdatedAtSnake) {
    columns.push('"updated_at"')
    values.push(new Date())
    placeholders.push(`$${values.length}`)
  }

  await pool.query(
    `INSERT INTO "Company" (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    values
  )
}

const logDatabaseInfo = async () => {
  const result = await pool.query('SELECT current_database() AS db, current_schema() AS schema')
  const info = result.rows[0]
  console.log(`Connected to database: ${info?.db || 'unknown'} (schema: ${info?.schema || 'unknown'})`)
}

const getTableColumns = async (tableName) => {
  const result = await pool.query(
    'SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1',
    [tableName]
  )
  return new Set(result.rows.map((row) => row.column_name))
}

const resolveColumn = (columns, candidates) => {
  const lowerMap = new Map()
  for (const column of columns) {
    lowerMap.set(String(column).toLowerCase(), column)
  }

  for (const candidate of candidates) {
    const match = lowerMap.get(String(candidate).toLowerCase())
    if (match) return match
  }

  return null
}

const getForeignKeyTarget = async (tableName, columnName) => {
  const result = await pool.query(
    `SELECT ccu.table_name AS referenced_table
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_name = $1
       AND kcu.column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  )
  return result.rows[0]?.referenced_table ?? null
}

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body || {}
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password, role, "companyId" FROM "User" WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    )

    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' })
    }

    const requestedRole = typeof role === 'string' ? role.toLowerCase() : null
    const userRole = typeof user.role === 'string' ? user.role.toLowerCase() : user.role

    if (requestedRole && userRole !== requestedRole) {
      return res.status(401).json({ message: 'Invalid role for this account.' })
    }

    const matches = await bcrypt.compare(password, user.password)

    if (!matches) {
      return res.status(401).json({ message: 'Invalid credentials.' })
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      role: userRole,
      companyId: user.companyId,
    }

    return res.json({
      token: 'dev-session-token',
      user: safeUser,
    })
  } catch (error) {
    console.error('Login error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.get('/api/admin/summary', async (_req, res) => {
  try {
    const countsResult = await pool.query(
      'SELECT (SELECT COUNT(*) FROM "User")::int AS users, (SELECT COUNT(*) FROM "Company")::int AS companies, (SELECT COUNT(*) FROM "Post")::int AS posts, (SELECT COUNT(*) FROM "Comment")::int AS comments'
    )

    const postsResult = await pool.query(
      'SELECT p.id, p.title, p."createdAt", c.name AS company FROM "Post" p JOIN "Company" c ON c.id = p."authorId" ORDER BY p."createdAt" DESC LIMIT 4'
    )

    const activityResult = await pool.query(
      'SELECT c.content, c."createdAt", co.name AS company, p.title AS post_title FROM "Comment" c JOIN "Company" co ON co.id = c."authorId" JOIN "Post" p ON p.id = c."postId" ORDER BY c."createdAt" DESC LIMIT 5'
    )

    const stats = countsResult.rows[0]

    const activity = activityResult.rows.map((row) => ({
      title: row.company,
      note: row.content,
      time: new Date(row.createdAt).toLocaleString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
      }),
      tag: row.post_title,
    }))

    const recentPosts = postsResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      createdAt: row.createdAt,
    }))

    return res.json({
      stats,
      activity,
      recentPosts,
    })
  } catch (error) {
    console.error('Summary error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.get('/api/admin/companies', async (_req, res) => {
  try {
    const companyColumns = await getTableColumns('Company')

    const hasIndustry = companyColumns.has('industry')
    const hasLocation = companyColumns.has('location')
    const hasStatus = companyColumns.has('status')
    const hasWebsite = companyColumns.has('website')
    const hasEmail = companyColumns.has('email')
    const hasPhone = companyColumns.has('phone')
    const hasDescription = companyColumns.has('description')

    const industrySelect = hasIndustry ? 'c.industry AS industry' : 'NULL::text AS industry'
    const locationSelect = hasLocation ? 'c.location AS location' : 'NULL::text AS location'
    const statusSelect = hasStatus ? 'c.status AS status' : 'NULL::text AS status'
    const websiteSelect = hasWebsite ? 'c.website AS website' : 'NULL::text AS website'
    const emailSelect = hasEmail ? 'c.email AS email' : 'NULL::text AS email'
    const phoneSelect = hasPhone ? 'c.phone AS phone' : 'NULL::text AS phone'
    const descriptionSelect = hasDescription ? 'c.description AS description' : 'NULL::text AS description'

    const groupBy = ['c.id', 'c.name']
    if (hasIndustry) groupBy.push('c.industry')
    if (hasLocation) groupBy.push('c.location')
    if (hasStatus) groupBy.push('c.status')
    if (hasWebsite) groupBy.push('c.website')
    if (hasEmail) groupBy.push('c.email')
    if (hasPhone) groupBy.push('c.phone')
    if (hasDescription) groupBy.push('c.description')

    const companiesResult = await pool.query(
      `SELECT c.id, c.name, ${industrySelect}, ${locationSelect}, ${statusSelect},
        ${websiteSelect}, ${emailSelect}, ${phoneSelect}, ${descriptionSelect},
        COUNT(u.id)::int AS employees,
        MIN(u.email) AS admin
      FROM "Company" c
      LEFT JOIN "User" u ON u."companyId" = c.id
      GROUP BY ${groupBy.join(', ')}
      ORDER BY c.name ASC`
    )

    res.set('Cache-Control', 'no-store')
    return res.json(companiesResult.rows)
  } catch (error) {
    console.error('Companies error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.post('/api/admin/companies', async (req, res) => {
  const body = req.body || {}

  if (!body.name || typeof body.name !== 'string') {
    return res.status(400).json({ message: 'name is required.' })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const companyColumns = await getTableColumns('Company')
    const hasUpdatedAt = companyColumns.has('updatedAt')
    const hasUpdatedAtSnake = companyColumns.has('updated_at')
    const fields = {
      name: body.name?.trim(),
      industry: body.industry,
      location: body.location,
      website: body.website,
      email: body.email,
      phone: body.phone,
      status: body.status,
      description: body.description,
    }

    const columns = ['name']
    const values = [fields.name]
    const placeholders = ['$1']

    Object.entries(fields).forEach(([key, value]) => {
      if (key === 'name') return
      if (!companyColumns.has(key)) return
      if (typeof value === 'undefined') return
      const normalized = value === '' ? null : value
      columns.push(key)
      values.push(normalized)
      placeholders.push(`$${values.length}`)
    })

    if (hasUpdatedAt) {
      columns.push('"updatedAt"')
      values.push(new Date())
      placeholders.push(`$${values.length}`)
    } else if (hasUpdatedAtSnake) {
      columns.push('"updated_at"')
      values.push(new Date())
      placeholders.push(`$${values.length}`)
    }

    const insertResult = await client.query(
      `INSERT INTO "Company" (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    )

    const company = insertResult.rows[0]

    if (body.email && body.password) {
      const userColumns = await getTableColumns('User')
      const canCreateUser = ['email', 'password', 'role', 'companyId'].every((col) => userColumns.has(col))
      const userHasUpdatedAt = userColumns.has('updatedAt')
      const userHasUpdatedAtSnake = userColumns.has('updated_at')

      if (canCreateUser) {
        const enumResult = await client.query(
          'SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE lower(t.typname) = lower($1) ORDER BY e.enumsortorder',
          ['Role']
        )
        const enumValues = enumResult.rows.map((row) => row.enumlabel)
        const preferredCompanyRole = 'company'
        let roleValue = preferredCompanyRole

        if (enumValues.length) {
          const normalizedEnumValues = enumValues.map((value) => value.toLowerCase())

          if (!normalizedEnumValues.includes(preferredCompanyRole)) {
            const typeResult = await client.query(
              'SELECT typname FROM pg_type WHERE typname = $1 OR typname = $2 LIMIT 1',
              ['Role', 'role']
            )
            const typeName = typeResult.rows[0]?.typname

            if (typeName && /^[A-Za-z0-9_]+$/.test(typeName)) {
              await client.query(`ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS '${preferredCompanyRole}'`)
              const refreshedEnum = await client.query(
                'SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE lower(t.typname) = lower($1) ORDER BY e.enumsortorder',
                [typeName]
              )
              const refreshedValues = refreshedEnum.rows.map((row) => row.enumlabel)
              const refreshedNormalized = refreshedValues.map((value) => value.toLowerCase())
              const matchedIndex = refreshedNormalized.indexOf(preferredCompanyRole)
              roleValue = matchedIndex >= 0 ? refreshedValues[matchedIndex] : preferredCompanyRole
            } else {
              await client.query('ROLLBACK')
              return res.status(400).json({
                message: 'Role enum does not include "company" and could not be updated automatically.',
              })
            }
          } else {
            const matchedIndex = normalizedEnumValues.indexOf(preferredCompanyRole)
            roleValue = enumValues[matchedIndex]
          }
        }

        const existingUser = await client.query(
          'SELECT id FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1',
          [body.email]
        )

        if (existingUser.rows.length) {
          await client.query('ROLLBACK')
          return res.status(400).json({ message: 'Email already exists.' })
        }

        const hashedPassword = await bcrypt.hash(String(body.password), 10)
        const userColumnsList = ['email', 'password', 'role', '"companyId"']
        const userValues = [body.email, hashedPassword, roleValue, company.id]
        const userPlaceholders = ['$1', '$2', '$3', '$4']

        if (userHasUpdatedAt) {
          userColumnsList.push('"updatedAt"')
          userValues.push(new Date())
          userPlaceholders.push(`$${userValues.length}`)
        } else if (userHasUpdatedAtSnake) {
          userColumnsList.push('"updated_at"')
          userValues.push(new Date())
          userPlaceholders.push(`$${userValues.length}`)
        }

        await client.query(
          `INSERT INTO "User" (${userColumnsList.join(', ')}) VALUES (${userPlaceholders.join(', ')})`,
          userValues
        )
      }
    }

    await client.query('COMMIT')
    return res.json(company)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Create company error', error)
    return res.status(500).json({ message: error?.message || 'Server error.' })
  } finally {
    client.release()
  }
})

app.put('/api/admin/companies/:id', async (req, res) => {
  const companyId = Number(req.params.id)

  if (!companyId) {
    return res.status(400).json({ message: 'Invalid company id.' })
  }

  try {
    const companyColumns = await getTableColumns('Company')
    const hasUpdatedAt = companyColumns.has('updatedAt')
    const hasUpdatedAtSnake = companyColumns.has('updated_at')
    const fields = {
      name: req.body?.name,
      industry: req.body?.industry,
      location: req.body?.location,
      website: req.body?.website,
      email: req.body?.email,
      phone: req.body?.phone,
      status: req.body?.status,
      description: req.body?.description,
    }

    const setFragments = []
    const values = []

    Object.entries(fields).forEach(([key, value]) => {
      if (!companyColumns.has(key)) return
      if (!Object.prototype.hasOwnProperty.call(req.body || {}, key)) return
      const normalized = value === '' ? null : value
      values.push(normalized)
      setFragments.push(`${key} = $${values.length}`)
    })

    if (hasUpdatedAt && setFragments.length) {
      values.push(new Date())
      setFragments.push(`"updatedAt" = $${values.length}`)
    } else if (hasUpdatedAtSnake && setFragments.length) {
      values.push(new Date())
      setFragments.push(`"updated_at" = $${values.length}`)
    }

    if (!setFragments.length) {
      return res.status(400).json({ message: 'No fields to update.' })
    }

    values.push(companyId)
    const updateResult = await pool.query(
      `UPDATE "Company" SET ${setFragments.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (!updateResult.rows.length) {
      return res.status(404).json({ message: 'Company not found.' })
    }

    return res.json(updateResult.rows[0])
  } catch (error) {
    console.error('Update company error', error)
    return res.status(500).json({ message: error?.message || 'Server error.' })
  }
})

app.delete('/api/admin/companies/:id', async (req, res) => {
  const companyId = Number(req.params.id)

  if (!companyId) {
    return res.status(400).json({ message: 'Invalid company id.' })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const userColumns = await getTableColumns('User')
    const postColumns = await getTableColumns('Post')
    const commentColumns = await getTableColumns('Comment')

    const userCompanyColumn = resolveColumn(userColumns, ['companyId', 'company_id'])
    const postAuthorColumn = resolveColumn(postColumns, ['authorId', 'author_id'])
    const commentPostColumn = resolveColumn(commentColumns, ['postId', 'post_id'])
    const commentCompanyColumn = resolveColumn(commentColumns, ['companyId', 'company_id'])
    const commentUserColumn = resolveColumn(commentColumns, ['userId', 'user_id'])
    const commentAuthorColumn = resolveColumn(commentColumns, ['authorId', 'author_id'])

    await client.query('DELETE FROM "Message" WHERE "senderCompanyId" = $1 OR "receiverCompanyId" = $1', [companyId])

    if (commentCompanyColumn) {
      await client.query(
        `DELETE FROM "Comment" WHERE ${quoteIdentifier(commentCompanyColumn)} = $1`,
        [companyId]
      )
    }

    if (commentAuthorColumn) {
      await client.query(
        `DELETE FROM "Comment" WHERE ${quoteIdentifier(commentAuthorColumn)} = $1`,
        [companyId]
      )
    }

    if (commentUserColumn && userCompanyColumn) {
      await client.query(
        `DELETE FROM "Comment" WHERE ${quoteIdentifier(commentUserColumn)} IN (
          SELECT id FROM "User" WHERE ${quoteIdentifier(userCompanyColumn)} = $1
        )`,
        [companyId]
      )
    }

    if (commentPostColumn && postAuthorColumn) {
      await client.query(
        `DELETE FROM "Comment" WHERE ${quoteIdentifier(commentPostColumn)} IN (
          SELECT id FROM "Post" WHERE ${quoteIdentifier(postAuthorColumn)} = $1
        )`,
        [companyId]
      )
    }

    if (postAuthorColumn) {
      await client.query(
        `DELETE FROM "Post" WHERE ${quoteIdentifier(postAuthorColumn)} = $1`,
        [companyId]
      )
    }

    if (userCompanyColumn) {
      await client.query(
        `DELETE FROM "User" WHERE ${quoteIdentifier(userCompanyColumn)} = $1`,
        [companyId]
      )
    }

    const deleteResult = await client.query('DELETE FROM "Company" WHERE id = $1 RETURNING id', [companyId])

    if (!deleteResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Company not found.' })
    }

    await client.query('COMMIT')
    return res.json({ id: companyId })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Delete company error', error)
    return res.status(500).json({ message: error?.message || 'Server error.' })
  } finally {
    client.release()
  }
})

app.get('/api/admin/posts', async (_req, res) => {
  try {
    const postColumns = await getTableColumns('Post')

    const hasCategory = postColumns.has('category')
    const hasStatus = postColumns.has('status')
    const hasViews = postColumns.has('views')

    const categorySelect = hasCategory ? 'p.category AS category' : 'NULL::text AS category'
    const statusSelect = hasStatus ? 'p.status AS status' : 'NULL::text AS status'
    const viewsSelect = hasViews ? 'p.views::int AS views' : '0::int AS views'

    const groupBy = ['p.id', 'p.title', 'p."createdAt"', 'c.name', 'c.id']
    if (hasCategory) groupBy.push('p.category')
    if (hasStatus) groupBy.push('p.status')
    if (hasViews) groupBy.push('p.views')

    const postsResult = await pool.query(
      `SELECT p.id, p.title, p."createdAt", ${categorySelect}, ${statusSelect}, ${viewsSelect},
        c.name AS company, COUNT(cm.id)::int AS comments
      FROM "Post" p
      JOIN "Company" c ON c.id = p."authorId"
      LEFT JOIN "Comment" cm ON cm."postId" = p.id
      GROUP BY ${groupBy.join(', ')}
      ORDER BY p."createdAt" DESC
      LIMIT 12`
    )

    return res.json(postsResult.rows)
  } catch (error) {
    console.error('Posts error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.get('/api/admin/users', async (_req, res) => {
  try {
    const userColumns = await getTableColumns('User')

    const hasName = userColumns.has('name')
    const hasStatus = userColumns.has('status')
    const hasLastActive = userColumns.has('lastActive')

    const nameSelect = hasName ? 'u.name AS name' : 'NULL::text AS name'
    const statusSelect = hasStatus ? 'u.status AS status' : 'NULL::text AS status'
    const lastActiveSelect = hasLastActive ? 'u."lastActive" AS "lastActive"' : 'NULL::text AS "lastActive"'

    const groupBy = ['u.id', 'u.email', 'u.role', 'c.name']
    if (hasName) groupBy.push('u.name')
    if (hasStatus) groupBy.push('u.status')
    if (hasLastActive) groupBy.push('u."lastActive"')

    const usersResult = await pool.query(
      `SELECT u.id, u.email, u.role, ${nameSelect}, ${statusSelect}, ${lastActiveSelect},
        c.name AS company
      FROM "User" u
      LEFT JOIN "Company" c ON c.id = u."companyId"
      GROUP BY ${groupBy.join(', ')}
      ORDER BY u.id DESC`
    )

    return res.json(usersResult.rows)
  } catch (error) {
    console.error('Users error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.get('/api/admin/messages', async (_req, res) => {
  try {
    const messagesResult = await pool.query(
      `SELECT cm.id, cm.content, cm."createdAt", co.name AS company, p.title AS post_title
      FROM "Comment" cm
      JOIN "Company" co ON co.id = cm."authorId"
      JOIN "Post" p ON p.id = cm."postId"
      ORDER BY cm."createdAt" DESC
      LIMIT 20`
    )

    const messages = messagesResult.rows.map((row) => ({
      id: row.id,
      from: row.company,
      subject: row.post_title,
      createdAt: row.createdAt,
      preview: row.content,
    }))

    return res.json(messages)
  } catch (error) {
    console.error('Messages error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.get('/api/profile', async (req, res) => {
  const userId = Number(req.query.userId)
  const companyIdParam = Number(req.query.companyId)

  if (!userId) {
    return res.status(400).json({ message: 'userId is required.' })
  }

  try {
    const userColumns = await getTableColumns('User')
    const hasName = userColumns.has('name')
    const hasPhone = userColumns.has('phone')
    const hasAvatar = userColumns.has('avatar')

    const nameSelect = hasName ? 'u.name AS name' : 'NULL::text AS name'
    const phoneSelect = hasPhone ? 'u.phone AS phone' : 'NULL::text AS phone'
    const avatarSelect = hasAvatar ? 'u.avatar AS avatar' : 'NULL::text AS avatar'

    const userResult = await pool.query(
      `SELECT u.id, u.email, u."companyId", ${nameSelect}, ${phoneSelect}, ${avatarSelect}
       FROM "User" u
       WHERE u.id = $1
       LIMIT 1`,
      [userId]
    )

    const user = userResult.rows[0]

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const resolvedCompanyId = companyIdParam || user.companyId

    let company = null
    if (resolvedCompanyId) {
      const companyColumns = await getTableColumns('Company')
      const hasDescription = companyColumns.has('description')
      const hasWebsite = companyColumns.has('website')
      const hasLocation = companyColumns.has('location')
      const hasPhoneCompany = companyColumns.has('phone')
      const hasEmailCompany = companyColumns.has('email')
      const hasIndustry = companyColumns.has('industry')
      const hasStatus = companyColumns.has('status')

      const descriptionSelect = hasDescription ? 'c.description AS description' : 'NULL::text AS description'
      const websiteSelect = hasWebsite ? 'c.website AS website' : 'NULL::text AS website'
      const locationSelect = hasLocation ? 'c.location AS location' : 'NULL::text AS location'
      const phoneSelectCompany = hasPhoneCompany ? 'c.phone AS phone' : 'NULL::text AS phone'
      const emailSelectCompany = hasEmailCompany ? 'c.email AS email' : 'NULL::text AS email'
      const industrySelect = hasIndustry ? 'c.industry AS industry' : 'NULL::text AS industry'
      const statusSelect = hasStatus ? 'c.status AS status' : 'NULL::text AS status'

      const companyResult = await pool.query(
        `SELECT c.id, c.name, ${descriptionSelect}, ${websiteSelect}, ${locationSelect}, ${phoneSelectCompany}, ${emailSelectCompany}, ${industrySelect}, ${statusSelect}
         FROM "Company" c
         WHERE c.id = $1
         LIMIT 1`,
        [resolvedCompanyId]
      )

      company = companyResult.rows[0] || null
    }

    return res.json({ user, company })
  } catch (error) {
    console.error('Profile error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.put('/api/profile', async (req, res) => {
  const { userId, companyId, user: userPayload, company: companyPayload } = req.body || {}

  if (!userId) {
    return res.status(400).json({ message: 'userId is required.' })
  }

  try {
    const updates = {}
    const userColumns = await getTableColumns('User')

    const userFields = {
      name: userPayload?.name,
      email: userPayload?.email,
      phone: userPayload?.phone,
      avatar: userPayload?.avatar,
    }

    const userSetFragments = []
    const userValues = []

    Object.entries(userFields).forEach(([key, value]) => {
      if (!userColumns.has(key)) return
      if (!Object.prototype.hasOwnProperty.call(userPayload || {}, key)) return
      const normalized = value === '' ? null : value
      userValues.push(normalized)
      userSetFragments.push(`${key} = $${userValues.length}`)
    })

    if (userSetFragments.length) {
      userValues.push(userId)
      const userResult = await pool.query(
        `UPDATE "User" SET ${userSetFragments.join(', ')} WHERE id = $${userValues.length} RETURNING id, email, "companyId"`,
        userValues
      )
      updates.user = userResult.rows[0] || null
    }

    const resolvedCompanyId = companyId || updates.user?.companyId

    if (resolvedCompanyId && companyPayload) {
      const companyColumns = await getTableColumns('Company')
      const hasUpdatedAt = companyColumns.has('updatedAt')
      const hasUpdatedAtSnake = companyColumns.has('updated_at')

      const companyFields = {
        name: companyPayload?.name,
        description: companyPayload?.description,
        website: companyPayload?.website,
        location: companyPayload?.location,
        phone: companyPayload?.phone,
        email: companyPayload?.email,
        industry: companyPayload?.industry,
        status: companyPayload?.status,
      }

      const companySetFragments = []
      const companyValues = []

      Object.entries(companyFields).forEach(([key, value]) => {
        if (!companyColumns.has(key)) return
        if (!Object.prototype.hasOwnProperty.call(companyPayload || {}, key)) return
        const normalized = value === '' ? null : value
        companyValues.push(normalized)
        companySetFragments.push(`${key} = $${companyValues.length}`)
      })

      if (companySetFragments.length) {
        if (hasUpdatedAt) {
          companyValues.push(new Date())
          companySetFragments.push(`"updatedAt" = $${companyValues.length}`)
        } else if (hasUpdatedAtSnake) {
          companyValues.push(new Date())
          companySetFragments.push(`"updated_at" = $${companyValues.length}`)
        }

        companyValues.push(resolvedCompanyId)
        const companyResult = await pool.query(
          `UPDATE "Company" SET ${companySetFragments.join(', ')} WHERE id = $${companyValues.length} RETURNING id, name`,
          companyValues
        )
        updates.company = companyResult.rows[0] || null
      }
    }

    return res.json({ ok: true, ...updates })
  } catch (error) {
    console.error('Profile update error', error)
    return res.status(500).json({ message: error?.message || 'Server error.' })
  }
})

app.get('/api/settings/notifications', async (req, res) => {
  const userId = Number(req.query.userId)

  if (!userId) {
    return res.status(400).json({ message: 'userId is required.' })
  }

  try {
    const result = await pool.query(
      'SELECT notifications FROM "UserSettings" WHERE "userId" = $1 LIMIT 1',
      [userId]
    )

    const notifications = result.rows[0]?.notifications || {}
    return res.json({ notifications })
  } catch (error) {
    console.error('Notifications error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.put('/api/settings/notifications', async (req, res) => {
  const { userId, notifications } = req.body || {}

  if (!userId) {
    return res.status(400).json({ message: 'userId is required.' })
  }

  try {
    const payload = notifications && typeof notifications === 'object' ? notifications : {}
    const result = await pool.query(
      `INSERT INTO "UserSettings" ("userId", notifications, "updatedAt")
       VALUES ($1, $2, NOW())
       ON CONFLICT ("userId") DO UPDATE SET notifications = EXCLUDED.notifications, "updatedAt" = NOW()
       RETURNING notifications`,
      [userId, payload]
    )

    return res.json({ notifications: result.rows[0]?.notifications || {} })
  } catch (error) {
    console.error('Notifications update error', error)
    return res.status(500).json({ message: error?.message || 'Server error.' })
  }
})

app.get('/api/companies', async (_req, res) => {
  try {
    const companyColumns = await getTableColumns('Company')

    const hasIndustry = companyColumns.has('industry')
    const hasLocation = companyColumns.has('location')
    const hasWebsite = companyColumns.has('website')
    const hasEmail = companyColumns.has('email')
    const hasPhone = companyColumns.has('phone')
    const hasStatus = companyColumns.has('status')
    const hasDescription = companyColumns.has('description')

    const industrySelect = hasIndustry ? 'c.industry AS industry' : 'NULL::text AS industry'
    const locationSelect = hasLocation ? 'c.location AS location' : 'NULL::text AS location'
    const websiteSelect = hasWebsite ? 'c.website AS website' : 'NULL::text AS website'
    const emailSelect = hasEmail ? 'c.email AS email' : 'NULL::text AS email'
    const phoneSelect = hasPhone ? 'c.phone AS phone' : 'NULL::text AS phone'
    const statusSelect = hasStatus ? 'c.status AS status' : 'NULL::text AS status'
    const descriptionSelect = hasDescription ? 'c.description AS description' : 'NULL::text AS description'

    const groupBy = ['c.id', 'c.name']
    if (hasIndustry) groupBy.push('c.industry')
    if (hasLocation) groupBy.push('c.location')
    if (hasWebsite) groupBy.push('c.website')
    if (hasEmail) groupBy.push('c.email')
    if (hasPhone) groupBy.push('c.phone')
    if (hasStatus) groupBy.push('c.status')
    if (hasDescription) groupBy.push('c.description')

    const companiesResult = await pool.query(
      `SELECT c.id, c.name, ${industrySelect}, ${locationSelect}, ${websiteSelect}, ${emailSelect}, ${phoneSelect}, ${statusSelect}, ${descriptionSelect},
        COUNT(u.id)::int AS employees
      FROM "Company" c
      LEFT JOIN "User" u ON u."companyId" = c.id
      GROUP BY ${groupBy.join(', ')}
      ORDER BY c.name ASC`
    )

    res.set('Cache-Control', 'no-store')
    return res.json(companiesResult.rows)
  } catch (error) {
    console.error('Companies list error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.get('/api/forum/posts', async (_req, res) => {
  try {
    const postColumns = await getTableColumns('Post')
    const hasContent = postColumns.has('content')
    const hasCategory = postColumns.has('category')
    const hasUpdatedAt = postColumns.has('updatedAt')

    const contentSelect = hasContent ? 'p.content AS content' : 'p.title AS content'
    const categorySelect = hasCategory ? 'p.category AS category' : 'NULL::text AS category'

    const groupBy = ['p.id', 'p.title', 'p."createdAt"', 'c.name', 'c.id']
    if (hasContent) groupBy.push('p.content')
    if (hasCategory) groupBy.push('p.category')

    const postsResult = await pool.query(
      `SELECT p.id, p.title, ${contentSelect}, ${categorySelect}, p."createdAt",
        c.name AS company, c.id AS "companyId",
        COUNT(cm.id)::int AS comments
      FROM "Post" p
      JOIN "Company" c ON c.id = p."authorId"
      LEFT JOIN "Comment" cm ON cm."postId" = p.id
      GROUP BY ${groupBy.join(', ')}
      ORDER BY p."createdAt" DESC
      LIMIT 100`
    )

    return res.json(postsResult.rows)
  } catch (error) {
    console.error('Forum posts error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.post('/api/forum/posts', async (req, res) => {
  const { title, content, category, companyId, userId } = req.body || {}

  if (!title) {
    return res.status(400).json({ message: 'Title is required.' })
  }

  try {
    let resolvedCompanyId = companyId ? Number(companyId) : null

    if (!resolvedCompanyId && userId) {
      const userResult = await pool.query('SELECT "companyId" FROM "User" WHERE id = $1 LIMIT 1', [userId])
      resolvedCompanyId = userResult.rows[0]?.companyId ?? null
    }

    if (!resolvedCompanyId) {
      return res.status(400).json({ message: 'Company is required to create a post.' })
    }

    const companyResult = await pool.query('SELECT id FROM "Company" WHERE id = $1 LIMIT 1', [resolvedCompanyId])
    if (!companyResult.rows.length) {
      return res.status(400).json({ message: 'Company not found.' })
    }

    const postColumns = await getTableColumns('Post')
    const hasContent = postColumns.has('content')
    const hasCategory = postColumns.has('category')
    const hasUpdatedAt = postColumns.has('updatedAt')

    const columns = ['title', '"authorId"']
    const values = [title, resolvedCompanyId]
    const placeholders = ['$1', '$2']

    if (hasContent) {
      columns.push('content')
      values.push(content || '')
      placeholders.push(`$${values.length}`)
    }

    if (hasCategory) {
      columns.push('category')
      values.push(category || null)
      placeholders.push(`$${values.length}`)
    }

    if (hasUpdatedAt) {
      columns.push('"updatedAt"')
      values.push(new Date())
      placeholders.push(`$${values.length}`)
    }

    const insertResult = await pool.query(
      `INSERT INTO "Post" (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id, title, "createdAt"`,
      values
    )

    const post = insertResult.rows[0]

    return res.json({
      id: post.id,
      title: post.title,
      content: hasContent ? content || '' : post.title,
      category: hasCategory ? category || null : null,
      createdAt: post.createdAt,
      companyId: resolvedCompanyId,
      comments: 0,
    })
  } catch (error) {
    console.error('Create post error', error)
    return res.status(500).json({ message: error?.message || 'Server error.' })
  }
})

app.delete('/api/forum/posts/:id', async (req, res) => {
  const postId = Number(req.params.id)

  if (!postId) {
    return res.status(400).json({ message: 'Invalid post id.' })
  }

  try {
    await pool.query('DELETE FROM "Comment" WHERE "postId" = $1', [postId])

    const deleteResult = await pool.query('DELETE FROM "Post" WHERE id = $1 RETURNING id', [postId])

    if (!deleteResult.rows.length) {
      return res.status(404).json({ message: 'Post not found.' })
    }

    return res.json({ id: postId })
  } catch (error) {
    console.error('Delete post error', error)
    return res.status(500).json({ message: error?.message || 'Server error.' })
  }
})

app.get('/api/forum/posts/:id/comments', async (req, res) => {
  const postId = Number(req.params.id)

  if (!postId) {
    return res.status(400).json({ message: 'Invalid post id.' })
  }

  try {
    const commentColumns = await getTableColumns('Comment')
    const postIdColumn = resolveColumn(commentColumns, ['postId', 'post_id'])
    const createdAtColumn = resolveColumn(commentColumns, ['createdAt', 'created_at'])
    const updatedAtColumn = resolveColumn(commentColumns, ['updatedAt', 'updated_at'])
    const companyIdColumn = resolveColumn(commentColumns, ['companyId', 'company_id'])
    const userIdColumn = resolveColumn(commentColumns, ['userId', 'user_id'])
    const authorIdColumn = resolveColumn(commentColumns, ['authorId', 'author_id'])

    if (!postIdColumn) {
      return res.status(500).json({ message: 'Comment schema is missing post reference.' })
    }

    let joinClause = ''
    let companySelect = 'NULL::text AS company, NULL::int AS "companyId"'

    if (companyIdColumn) {
      joinClause = `LEFT JOIN "Company" c ON c.id = cm.${quoteIdentifier(companyIdColumn)}`
      companySelect = 'c.name AS company, c.id AS "companyId"'
    } else if (userIdColumn) {
      joinClause = `LEFT JOIN "User" u ON u.id = cm.${quoteIdentifier(userIdColumn)} LEFT JOIN "Company" c ON c.id = u."companyId"`
      companySelect = 'c.name AS company, c.id AS "companyId"'
    } else if (authorIdColumn) {
      const targetTable = await getForeignKeyTarget('Comment', authorIdColumn)
      if (targetTable && targetTable.toLowerCase() === 'user') {
        joinClause = `LEFT JOIN "User" u ON u.id = cm.${quoteIdentifier(authorIdColumn)} LEFT JOIN "Company" c ON c.id = u."companyId"`
        companySelect = 'c.name AS company, c.id AS "companyId"'
      } else {
        joinClause = `LEFT JOIN "Company" c ON c.id = cm.${quoteIdentifier(authorIdColumn)}`
        companySelect = 'c.name AS company, c.id AS "companyId"'
      }
    }

    const createdAtSelect = createdAtColumn ? `cm.${quoteIdentifier(createdAtColumn)} AS "createdAt"` : 'NULL::timestamp AS "createdAt"'

    const commentsResult = await pool.query(
      `SELECT cm.id, cm.content, ${createdAtSelect}, ${companySelect}
      FROM "Comment" cm
      ${joinClause}
      WHERE cm.${quoteIdentifier(postIdColumn)} = $1
      ORDER BY ${createdAtColumn ? `cm.${quoteIdentifier(createdAtColumn)}` : 'cm.id'} ASC`,
      [postId]
    )

    return res.json(commentsResult.rows)
  } catch (error) {
    console.error('Comments error', error)
    return res.status(500).json({ message: error?.message || 'Server error.' })
  }
})

app.post('/api/forum/posts/:id/comments', async (req, res) => {
  const postId = Number(req.params.id)
  const { content, companyId, userId } = req.body || {}

  if (!postId || !content) {
    return res.status(400).json({ message: 'Post and content are required.' })
  }

  try {
    let resolvedCompanyId = companyId ? Number(companyId) : null
    const resolvedUserId = userId ? Number(userId) : null

    if (!resolvedCompanyId && userId) {
      const userResult = await pool.query('SELECT "companyId" FROM "User" WHERE id = $1 LIMIT 1', [userId])
      resolvedCompanyId = userResult.rows[0]?.companyId ?? null
    }

    if (!resolvedCompanyId) {
      return res.status(400).json({ message: 'Company is required to comment.' })
    }

    const companyResult = await pool.query('SELECT id, name FROM "Company" WHERE id = $1 LIMIT 1', [resolvedCompanyId])
    if (!companyResult.rows.length) {
      return res.status(400).json({ message: 'Company not found.' })
    }

    const commentColumns = await getTableColumns('Comment')
    const postIdColumn = resolveColumn(commentColumns, ['postId', 'post_id'])
    const createdAtColumn = resolveColumn(commentColumns, ['createdAt', 'created_at'])
    const companyIdColumn = resolveColumn(commentColumns, ['companyId', 'company_id'])
    const userIdColumn = resolveColumn(commentColumns, ['userId', 'user_id'])
    const authorIdColumn = resolveColumn(commentColumns, ['authorId', 'author_id'])

    if (!postIdColumn) {
      return res.status(500).json({ message: 'Comment schema is missing post reference.' })
    }

    let authorColumn = null
    let authorValue = null

    if (companyIdColumn) {
      authorColumn = companyIdColumn
      authorValue = resolvedCompanyId
    } else if (userIdColumn) {
      authorColumn = userIdColumn
      authorValue = resolvedUserId
    } else if (authorIdColumn) {
      const targetTable = await getForeignKeyTarget('Comment', authorIdColumn)
      if (targetTable && targetTable.toLowerCase() === 'user') {
        authorColumn = authorIdColumn
        authorValue = resolvedUserId
      } else {
        authorColumn = authorIdColumn
        authorValue = resolvedCompanyId
      }
    }

    if (!authorColumn || !authorValue) {
      return res.status(400).json({ message: 'Author is required to comment.' })
    }

    const insertColumns = ['content', authorColumn, postIdColumn]
    const insertValues = [content, authorValue, postId]
    const insertPlaceholders = ['$1', '$2', '$3']

    if (createdAtColumn) {
      insertColumns.push(createdAtColumn)
      insertValues.push(new Date())
      insertPlaceholders.push(`$${insertValues.length}`)
    }

    if (updatedAtColumn) {
      insertColumns.push(updatedAtColumn)
      insertValues.push(new Date())
      insertPlaceholders.push(`$${insertValues.length}`)
    }

    const commentResult = await pool.query(
      `INSERT INTO "Comment" (${insertColumns.map(quoteIdentifier).join(', ')}) VALUES (${insertPlaceholders.join(', ')})
      RETURNING id, content${createdAtColumn ? `, ${quoteIdentifier(createdAtColumn)} AS "createdAt"` : ''}`,
      insertValues
    )

    const comment = commentResult.rows[0]
    const company = companyResult.rows[0].name

    return res.json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt || new Date().toISOString(),
      postId,
      companyId: resolvedCompanyId,
      company,
    })
  } catch (error) {
    console.error('Create comment error', error)
    return res.status(500).json({ message: error?.message || 'Server error.' })
  }
})

app.get('/api/messages', async (req, res) => {
  const companyId = Number(req.query.companyId)

  if (!companyId) {
    return res.status(400).json({ message: 'companyId is required.' })
  }

  try {
    const messagesResult = await pool.query(
      `SELECT m.id, m.content, m."createdAt",
        m."senderCompanyId", m."receiverCompanyId",
        cs.name AS "senderName", cr.name AS "receiverName"
      FROM "Message" m
      JOIN "Company" cs ON cs.id = m."senderCompanyId"
      JOIN "Company" cr ON cr.id = m."receiverCompanyId"
      WHERE m."senderCompanyId" = $1 OR m."receiverCompanyId" = $1
      ORDER BY m."createdAt" ASC`,
      [companyId]
    )

    return res.json(messagesResult.rows)
  } catch (error) {
    console.error('Messages list error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

app.post('/api/messages', async (req, res) => {
  const { senderCompanyId, receiverCompanyId, content } = req.body || {}

  if (!senderCompanyId || !receiverCompanyId || !content) {
    return res.status(400).json({ message: 'senderCompanyId, receiverCompanyId and content are required.' })
  }

  try {
    const messageResult = await pool.query(
      `INSERT INTO "Message" ("senderCompanyId", "receiverCompanyId", content)
      VALUES ($1, $2, $3)
      RETURNING id, content, "createdAt", "senderCompanyId", "receiverCompanyId"`,
      [senderCompanyId, receiverCompanyId, content]
    )

    return res.json(messageResult.rows[0])
  } catch (error) {
    console.error('Create message error', error)
    return res.status(500).json({ message: 'Server error.' })
  }
})

Promise.all([ensureMessagesTable(), ensureUserSettingsTable(), ensureAdminCompany(), logDatabaseInfo()])
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error('Failed to start server', error)
  })
