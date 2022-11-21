print('####################### [SCRIPT STARTED] ##########################')

db = db.getSiblingDB('admin')
try {
  db.createUser(
    {
      user: 'shuufare_admin',
      pwd: 'pnf82JKuYbNAhMmQfZLtN',
      roles: ['root']
    }
  )
} catch (err) {
  print('Admin user already created')
  db.auth('shuufare_admin', 'pnf82JKuYbNAhMmQfZLtN')
}
print('############################ [DONE] ###############################')
