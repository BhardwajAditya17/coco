const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

// Prisma v7 setup using PostgreSQL driver adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Fetch existing test accounts created in previous steps
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@communityconnect.org' },
  });

  const standardUser = await prisma.user.findUnique({
    where: { email: 'user@communityconnect.org' },
  });

  if (!adminUser || !standardUser) {
    console.error('❌ Test users missing! Ensure user seeding runs before post seeding.');
    return;
  }

  // 2. Create or find sample Tags
  console.log('🏷️ Creating tags...');
  const tagNames = ['FoodDrive', 'Volunteering', 'Healthcare', 'Education'];
  const createdTags = [];

  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    createdTags.push(tag);
  }

  // 3. Clear existing posts to prevent duplicate entries on seed re-runs
  console.log('🧹 Clearing old posts...');
  await prisma.post.deleteMany({});

  // 4. Seed Posts adhering to Post model (user_id, content, media_url)
  console.log('📝 Seeding posts...');

  const samplePosts = [
    {
      user_id: adminUser.id,
      content: 'We are organizing a food distribution drive in Sector 4 this weekend! Looking for 10 volunteers to help with sorting and transport.',
      media_url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433',
      tagIds: [createdTags[0].id, createdTags[1].id], // FoodDrive, Volunteering
    },
    {
      user_id: standardUser.id,
      content: 'Hope Foundation is looking for passionate math and science tutors for middle school students on Tuesday and Thursday afternoons.',
      media_url: null,
      tagIds: [createdTags[1].id, createdTags[3].id], // Volunteering, Education
    },
    {
      user_id: adminUser.id,
      content: 'Emergency clean drinking water distribution and medical kit setup near the community center today. Please share with anyone in need!',
      media_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b2',
      tagIds: [createdTags[0].id, createdTags[2].id], // FoodDrive, Healthcare
    },
  ];

  for (const post of samplePosts) {
    const { tagIds, ...postData } = post;

    const newPost = await prisma.post.create({
      data: {
        ...postData,
        tags: {
          create: tagIds.map((tag_id) => ({
            tag: { connect: { id: tag_id } },
          })),
        },
      },
    });

    console.log(`  └─ Created Post ID ${newPost.id} for User ID ${newPost.user_id}`);
  }

  console.log('✅ Post seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });