const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogqapklbgdhjbcpxgflz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncWFwa2xiZ2RoamJjcHhnZmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1OTI5NjcsImV4cCI6MjEwNjE2ODk2N30.1uyiz47bt56b-f7rmV7SHqA3wrHglW0twJl_BvmhIzk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  // Try to sign up a dummy user to test
  const email = `test-${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }

  const userId = authData.user.id;
  const businessId = 'test-business-id';
  const filePath = `${userId}/${businessId}/test.jpg`;

  console.log("Uploading to:", filePath);

  // create a dummy file buffer
  const fileBuffer = Buffer.from('dummy image data');

  const { data, error } = await supabase.storage
    .from('business-images')
    .upload(filePath, fileBuffer, {
      upsert: true,
      contentType: 'image/jpeg'
    });

  if (error) {
    console.error("\nUpload Error:");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Details:", error);
  } else {
    console.log("Upload success:", data);
  }
}

testUpload();
