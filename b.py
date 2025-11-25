import zipfile
import os
import subprocess
import shutil
import tempfile
import time
import sys
from pathlib import Path
from collections import defaultdict

# ==== USER CONFIG ====
ZIP_FILE = "/storage/emulated/0/verclehtml/verclehtml.zip"
EXTRACT_DIR = "upload_repo"
GITHUB_USERNAME = "rjanajana"
GITHUB_TOKEN = "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"
REPO_NAME = "Jwt-token-generateor-"  # Change this to your desired repository name
GIT_EMAIL = "rjanajana@example.com"  # Update with your email
GIT_NAME = "rjanajana"
# ======================

class GitUploader:
    def __init__(self):
        self.max_file_size = 100 * 1024 * 1024  # 100MB limit for GitHub
        self.large_files = []
        self.total_files = 0
        self.uploaded_files = 0
        self.zip_structure = {}  # Store ZIP structure info
        self.folder_stats = defaultdict(int)  # Count files per folder
        
    def log(self, message, level="INFO"):
        """Enhanced logging with timestamp and colors"""
        timestamp = time.strftime("%H:%M:%S")
        colors = {
            "INFO": "\033[94m",    # Blue
            "SUCCESS": "\033[92m", # Green
            "WARN": "\033[93m",    # Yellow
            "ERROR": "\033[91m",   # Red
            "DEBUG": "\033[90m",   # Gray
            "RESET": "\033[0m"     # Reset
        }
        color = colors.get(level, colors["INFO"])
        reset = colors["RESET"]
        print(f"{color}[{timestamp}] {level}: {message}{reset}")
        sys.stdout.flush()

    def analyze_zip_structure(self):
        """Analyze ZIP file structure before extraction"""
        self.log("🔍 Analyzing ZIP file structure...")
        
        if not os.path.exists(ZIP_FILE):
            self.log(f"ZIP file not found: {ZIP_FILE}", "ERROR")
            return False
            
        try:
            with zipfile.ZipFile(ZIP_FILE, 'r') as zip_ref:
                file_list = zip_ref.namelist()
                self.log(f"📦 Total items in ZIP: {len(file_list)}")
                
                # Analyze structure
                folders = set()
                files = []
                root_items = set()
                
                for item in file_list:
                    # Skip hidden/system files
                    if any(part.startswith('.') for part in item.split('/')):
                        continue
                        
                    # Count folder levels
                    parts = item.split('/')
                    if len(parts) > 0:
                        root_items.add(parts[0])
                    
                    if item.endswith('/'):
                        folders.add(item.rstrip('/'))
                        self.folder_stats[item.rstrip('/')] = 0
                    else:
                        files.append(item)
                        # Count files in each folder
                        folder_path = '/'.join(parts[:-1]) if len(parts) > 1 else 'root'
                        self.folder_stats[folder_path] += 1
                
                # Display structure analysis
                self.log(f"📁 Folders found: {len(folders)}")
                self.log(f"📄 Files found: {len(files)}")
                self.log(f"🌳 Root level items: {len(root_items)}")
                
                # Show root level structure
                self.log("📋 Root level structure:")
                for item in sorted(root_items):
                    item_path = os.path.join(EXTRACT_DIR, item)
                    if any(f.startswith(item + '/') for f in file_list):
                        file_count = sum(1 for f in files if f.startswith(item + '/'))
                        self.log(f"  📁 {item}/ ({file_count} files)")
                    else:
                        self.log(f"  📄 {item}")
                
                # Show folder statistics
                if len(self.folder_stats) > 1:
                    self.log("📊 Files per folder:")
                    for folder, count in sorted(self.folder_stats.items()):
                        if count > 0:
                            self.log(f"  📁 {folder}: {count} files")
                
                self.zip_structure = {
                    'total_items': len(file_list),
                    'folders': folders,
                    'files': files,
                    'root_items': root_items,
                    'has_single_root_folder': len(root_items) == 1 and len([r for r in root_items if not any(f == r for f in files)])
                }
                
                return True
                
        except Exception as e:
            self.log(f"Error analyzing ZIP structure: {e}", "ERROR")
            return False

    def run_git_command(self, cmd, cwd=None, timeout=300):
        """Run git command with better error handling and timeout"""
        try:
            self.log(f"🔧 Running: {' '.join(cmd)}", "DEBUG")
            result = subprocess.run(
                cmd, 
                cwd=cwd, 
                capture_output=True, 
                text=True, 
                timeout=timeout,
                encoding='utf-8',
                errors='replace'
            )
            
            if result.returncode != 0:
                self.log(f"Command failed: {result.stderr}", "ERROR")
                if result.stdout:
                    self.log(f"Output: {result.stdout}", "DEBUG")
                return False
            else:
                if result.stdout and result.stdout.strip():
                    self.log(f"✅ {result.stdout.strip()}", "DEBUG")
                return True
                
        except subprocess.TimeoutExpired:
            self.log(f"Command timed out after {timeout}s: {' '.join(cmd)}", "ERROR")
            return False
        except Exception as e:
            self.log(f"Error running {' '.join(cmd)}: {e}", "ERROR")
            return False

    def clean_extract_directory(self):
        """Clean and prepare extract directory"""
        self.log("🧹 Cleaning extract directory...")
        if os.path.exists(EXTRACT_DIR):
            try:
                shutil.rmtree(EXTRACT_DIR)
            except PermissionError:
                self.log("Permission error, trying to force delete...", "WARN")
                time.sleep(1)
                shutil.rmtree(EXTRACT_DIR, ignore_errors=True)
        
        os.makedirs(EXTRACT_DIR, exist_ok=True)
        self.log("✅ Extract directory ready")

    def extract_zip_file(self):
        """Extract ZIP file with progress tracking"""
        self.log("📦 Starting ZIP extraction...")
        
        if not os.path.exists(ZIP_FILE):
            self.log(f"ZIP file not found: {ZIP_FILE}", "ERROR")
            return False
            
        try:
            with zipfile.ZipFile(ZIP_FILE, 'r') as zip_ref:
                file_list = zip_ref.namelist()
                total_files = len(file_list)
                
                self.log(f"📤 Extracting {total_files} items...")
                
                extracted_count = 0
                skipped_count = 0
                
                for i, file_name in enumerate(file_list):
                    try:
                        # Skip hidden/system files
                        if any(part.startswith('.') and part not in ['.gitignore', '.env'] for part in file_name.split('/')):
                            skipped_count += 1
                            continue
                            
                        zip_ref.extract(file_name, EXTRACT_DIR)
                        extracted_count += 1
                        
                        # Progress update
                        if (i + 1) % 100 == 0 or i == total_files - 1:
                            progress = ((i + 1) / total_files) * 100
                            self.log(f"📊 Progress: {progress:.1f}% ({i + 1}/{total_files})")
                            
                    except Exception as e:
                        self.log(f"⚠️ Failed to extract {file_name}: {e}", "WARN")
                        skipped_count += 1
                        continue
                
                self.log(f"✅ Extraction complete: {extracted_count} extracted, {skipped_count} skipped")
                return True
                
        except Exception as e:
            self.log(f"❌ ZIP extraction failed: {e}", "ERROR")
            return False

    def smart_folder_normalization(self):
        """Smart folder structure normalization based on analysis"""
        self.log("🔄 Analyzing extracted folder structure...")
        
        if not self.zip_structure:
            self.log("No ZIP structure info available", "WARN")
            return
        
        items = os.listdir(EXTRACT_DIR)
        folders = [f for f in items if os.path.isdir(os.path.join(EXTRACT_DIR, f))]
        files = [f for f in items if os.path.isfile(os.path.join(EXTRACT_DIR, f))]
        
        self.log(f"📁 Current structure: {len(folders)} folders, {len(files)} files at root")
        
        # Decision logic for normalization
        should_normalize = False
        
        if len(folders) == 1 and len(files) == 0:
            # Single folder with no root files - likely needs normalization
            inner_folder = folders[0]
            inner_path = os.path.join(EXTRACT_DIR, inner_folder)
            inner_items = os.listdir(inner_path)
            
            self.log(f"🔍 Single folder '{inner_folder}' contains {len(inner_items)} items")
            
            # Check if inner folder looks like main content
            if len(inner_items) > 5 or any(item.lower() in ['src', 'lib', 'app', 'components', 'pages'] for item in inner_items):
                should_normalize = True
                self.log("💡 Detected nested project structure - will normalize")
        
        if should_normalize:
            try:
                inner_folder_path = os.path.join(EXTRACT_DIR, folders[0])
                temp_dir = f"{EXTRACT_DIR}_temp"
                
                self.log(f"🔧 Moving contents from '{folders[0]}' to root...")
                
                # Move inner folder to temp location
                shutil.move(inner_folder_path, temp_dir)
                
                # Remove extract dir and rename temp
                shutil.rmtree(EXTRACT_DIR)
                shutil.move(temp_dir, EXTRACT_DIR)
                
                self.log("✅ Folder structure normalized successfully")
                
                # Re-analyze after normalization
                new_items = os.listdir(EXTRACT_DIR)
                new_folders = [f for f in new_items if os.path.isdir(os.path.join(EXTRACT_DIR, f))]
                new_files = [f for f in new_items if os.path.isfile(os.path.join(EXTRACT_DIR, f))]
                self.log(f"📊 New structure: {len(new_folders)} folders, {len(new_files)} files at root")
                
            except Exception as e:
                self.log(f"❌ Error normalizing structure: {e}", "ERROR")
        else:
            self.log("📌 Keeping current folder structure")

    def detailed_file_analysis(self):
        """Detailed analysis of extracted files"""
        self.log("🔍 Performing detailed file analysis...")
        
        file_types = defaultdict(int)
        size_categories = {'small': 0, 'medium': 0, 'large': 0, 'huge': 0}
        
        for root, dirs, files in os.walk(EXTRACT_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    file_size = os.path.getsize(file_path)
                    self.total_files += 1
                    
                    # Categorize by size
                    if file_size < 1024:  # < 1KB
                        size_categories['small'] += 1
                    elif file_size < 1024 * 1024:  # < 1MB
                        size_categories['medium'] += 1
                    elif file_size < 100 * 1024 * 1024:  # < 100MB
                        size_categories['large'] += 1
                    else:  # >= 100MB
                        size_categories['huge'] += 1
                        rel_path = os.path.relpath(file_path, EXTRACT_DIR)
                        self.large_files.append((rel_path, file_size))
                        self.log(f"⚠️ Very large file: {rel_path} ({file_size / 1024 / 1024:.2f}MB)", "WARN")
                    
                    # Count by file type
                    ext = os.path.splitext(file)[1].lower()
                    if ext:
                        file_types[ext] += 1
                    else:
                        file_types['no_extension'] += 1
                        
                except OSError as e:
                    self.log(f"⚠️ Cannot access file {file_path}: {e}", "WARN")
        
        # Display analysis results
        self.log("📊 File Analysis Results:")
        self.log(f"  📄 Total files: {self.total_files}")
        
        if file_types:
            self.log("  📝 File types:")
            for ext, count in sorted(file_types.items(), key=lambda x: x[1], reverse=True)[:10]:
                self.log(f"    {ext or 'no extension'}: {count}")
        
        self.log("  📏 Size distribution:")
        for category, count in size_categories.items():
            if count > 0:
                self.log(f"    {category}: {count} files")
        
        if self.large_files:
            self.log(f"⚠️ Found {len(self.large_files)} files over 100MB limit")

    def create_smart_gitignore(self):
        """Create intelligent .gitignore based on detected files"""
        self.log("📝 Creating smart .gitignore...")
        
        # Base gitignore content
        gitignore_content = """# Dependencies
node_modules/
bower_components/
vendor/
.pnp
.pnp.js

# Build outputs
dist/
build/
.next/
.nuxt/
out/
target/
bin/
obj/

# Environment files
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock
.coverage
.nyc_output
coverage/

# Cache directories
.npm
.eslintcache
.cache
.parcel-cache
.sass-cache

# IDE and Editor files
.vscode/
.idea/
*.swp
*.swo
*~
.project
.classpath

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary files
*.tmp
*.temp
*.bak
*.backup

"""
        
        try:
            gitignore_path = '.gitignore'
            
            # Check if .gitignore already exists
            if os.path.exists(gitignore_path):
                self.log("📋 .gitignore already exists, backing up...")
                shutil.copy(gitignore_path, '.gitignore.backup')
            
            with open(gitignore_path, 'w', encoding='utf-8') as f:
                f.write(gitignore_content)
            
            self.log("✅ Smart .gitignore created")
            return True
        except Exception as e:
            self.log(f"⚠️ Could not create .gitignore: {e}", "WARN")
            return False

    def fix_git_ownership(self):
        """Fix git dubious ownership issues"""
        try:
            current_dir = os.getcwd()
            # Add current directory to safe directories
            self.run_git_command(["git", "config", "--global", "--add", "safe.directory", current_dir])
            self.run_git_command(["git", "config", "--global", "--add", "safe.directory", "*"])
            self.log("🔧 Fixed git ownership issues")
            return True
        except Exception as e:
            self.log(f"⚠️ Could not fix ownership: {e}", "WARN")
            return False

    def setup_git_repo(self):
        """Initialize and configure Git repository"""
        self.log("⚙️ Setting up Git repository...")
        
        try:
            original_dir = os.getcwd()
            os.chdir(EXTRACT_DIR)
            self.log(f"📂 Working in: {os.getcwd()}")
            
            # Fix ownership issues first
            self.fix_git_ownership()
            
            # Initialize git
            if not self.run_git_command(["git", "init"]):
                return False
            
            # Fix ownership again after init
            self.fix_git_ownership()
                
            # Configure git
            self.run_git_command(["git", "config", "user.email", GIT_EMAIL])
            self.run_git_command(["git", "config", "user.name", GIT_NAME])
            self.run_git_command(["git", "config", "push.default", "simple"])
            
            # Additional safety configs
            self.run_git_command(["git", "config", "--global", "init.defaultBranch", "main"])
            self.run_git_command(["git", "config", "--global", "safe.directory", os.getcwd()])
            
            # Create .gitignore
            self.create_smart_gitignore()
            
            self.log("✅ Git repository configured")
            return True
            
        except Exception as e:
            self.log(f"❌ Error setting up git repo: {e}", "ERROR")
            try:
                os.chdir(original_dir)
            except:
                pass
            return False

    def intelligent_file_staging(self):
        """Intelligent file staging with ownership fix"""
        self.log("📤 Starting intelligent file staging...")
        
        try:
            if not os.path.exists('.git'):
                self.log("❌ Not in git repository directory!", "ERROR")
                return False
            
            # Fix ownership before staging
            self.fix_git_ownership()
            
            # Get all files excluding .git
            all_files = []
            for root, dirs, files in os.walk('.'):
                if '.git' in root:
                    continue
                    
                for file in files:
                    file_path = os.path.relpath(os.path.join(root, file))
                    if not file_path.startswith('.git'):
                        all_files.append(file_path)
            
            self.log(f"📋 Found {len(all_files)} files to stage")
            
            if not all_files:
                self.log("⚠️ No files found to stage!", "WARN")
                return False
            
            # Try to add all files at once first (faster)
            self.log("🚀 Attempting bulk file staging...")
            if self.run_git_command(["git", "add", "."], timeout=300):
                self.log("✅ Bulk staging successful!")
                staged_count = len(all_files)
            else:
                self.log("⚠️ Bulk staging failed, trying batch method...")
                # Stage files in optimized batches
                batch_size = 30
                total_batches = (len(all_files) + batch_size - 1) // batch_size
                staged_count = 0
                
                for i in range(0, len(all_files), batch_size):
                    batch = all_files[i:i + batch_size]
                    batch_num = i // batch_size + 1
                    
                    self.log(f"📦 Staging batch {batch_num}/{total_batches} ({len(batch)} files)")
                    
                    # Try batch add first
                    cmd = ["git", "add"] + batch
                    if self.run_git_command(cmd, timeout=90):
                        staged_count += len(batch)
                    else:
                        self.log("⚠️ Batch failed, trying individual files...", "WARN")
                        # Individual file staging
                        for file_path in batch:
                            if os.path.exists(file_path):
                                if self.run_git_command(["git", "add", file_path], timeout=30):
                                    staged_count += 1
                            else:
                                self.log(f"⚠️ File not found: {file_path}", "WARN")
                    
                    # Progress update
                    progress = (batch_num / total_batches) * 100
                    self.log(f"📊 Staging progress: {progress:.1f}%")
            
            # Verify staging
            result = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
            actual_staged = len([line for line in result.stdout.split('\n') if line.strip()])
            
            self.log(f"✅ Successfully staged {actual_staged} files")
            return actual_staged > 0
            
        except Exception as e:
            self.log(f"❌ Error staging files: {e}", "ERROR")
            return False

    def commit_and_push(self):
        """Enhanced commit and push with retry logic"""
        self.log("💾 Committing changes...")
        
        # Check for changes
        result = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        if not result.stdout.strip():
            self.log("⚠️ No changes to commit", "WARN")
            return True
        
        # Create detailed commit message
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        commit_msg = f"""Complete repository upload - {timestamp}

📦 Uploaded from ZIP: {os.path.basename(ZIP_FILE)}
📊 Total files: {self.total_files}
🏗️ Structure: {len(self.zip_structure.get('folders', []))} folders, {len(self.zip_structure.get('files', []))} files
"""
        
        if not self.run_git_command(["git", "commit", "-m", commit_msg]):
            self.log("❌ Commit failed", "ERROR")
            return False
        
        # Setup remote
        repo_url = f"https://{GITHUB_USERNAME}:{GITHUB_TOKEN}@github.com/{GITHUB_USERNAME}/{REPO_NAME}.git"
        self.run_git_command(["git", "remote", "remove", "origin"])
        
        if not self.run_git_command(["git", "remote", "add", "origin", repo_url]):
            self.log("❌ Failed to add remote", "ERROR")
            return False
        
        # Push with enhanced retry
        self.log("🚀 Pushing to GitHub...")
        self.run_git_command(["git", "branch", "-M", "main"])
        
        max_retries = 3
        for attempt in range(max_retries):
            self.log(f"📤 Push attempt {attempt + 1}/{max_retries}")
            
            if self.run_git_command(["git", "push", "--force", "-u", "origin", "main"], timeout=900):
                self.log("🎉 Successfully pushed to GitHub!", "SUCCESS")
                return True
            else:
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 10
                    self.log(f"⏱️ Push failed, retrying in {wait_time} seconds...", "WARN")
                    time.sleep(wait_time)
                else:
                    self.log("❌ All push attempts failed", "ERROR")
        
        return False

    def display_comprehensive_summary(self):
        """Display comprehensive upload summary"""
        self.log("📋 === COMPREHENSIVE UPLOAD SUMMARY ===")
        self.log(f"🔗 Repository: https://github.com/{GITHUB_USERNAME}/{REPO_NAME}")
        self.log(f"📦 Source ZIP: {ZIP_FILE}")
        self.log(f"📊 Structure Analysis:")
        self.log(f"  📁 Total folders: {len(self.zip_structure.get('folders', []))}")
        self.log(f"  📄 Total files: {self.total_files}")
        self.log(f"  🌳 Root items: {len(self.zip_structure.get('root_items', []))}")
        
        if self.large_files:
            self.log(f"⚠️ Large files requiring attention ({len(self.large_files)}):")
            for file_path, size in self.large_files[:5]:  # Show only first 5
                self.log(f"  📋 {file_path} ({size / 1024 / 1024:.2f}MB)")
            if len(self.large_files) > 5:
                self.log(f"  ... and {len(self.large_files) - 5} more")

    def cleanup(self):
        """Enhanced cleanup with safety checks"""
        self.log("🧹 Cleaning up...")
        try:
            current_dir = os.getcwd()
            if EXTRACT_DIR in current_dir:
                parent_dir = os.path.dirname(current_dir)
                if parent_dir and os.path.exists(parent_dir):
                    os.chdir(parent_dir)
                else:
                    os.chdir("..")
            
            if os.path.exists(EXTRACT_DIR):
                shutil.rmtree(EXTRACT_DIR, ignore_errors=True)
            self.log("✅ Cleanup completed")
        except Exception as e:
            self.log(f"⚠️ Cleanup error (not critical): {e}", "WARN")

    def run(self):
        """Enhanced main execution method"""
        self.log("🚀 Starting Enhanced GitHub Upload Process...")
        
        try:
            # Step 1: Analyze ZIP structure
            if not self.analyze_zip_structure():
                return False
            
            # Step 2: Clean directory
            self.clean_extract_directory()
            
            # Step 3: Extract ZIP
            if not self.extract_zip_file():
                return False
            
            # Step 4: Smart folder normalization
            self.smart_folder_normalization()
            
            # Step 5: Detailed file analysis
            self.detailed_file_analysis()
            
            # Step 6: Setup Git
            if not self.setup_git_repo():
                return False
            
            # Step 7: Intelligent file staging
            if not self.intelligent_file_staging():
                return False
            
            # Step 8: Commit and push
            if not self.commit_and_push():
                return False
            
            # Step 9: Display summary
            self.display_comprehensive_summary()
            
            self.log("🎉 Upload process completed successfully!", "SUCCESS")
            return True
            
        except KeyboardInterrupt:
            self.log("⏹️ Process interrupted by user", "WARN")
            return False
        except Exception as e:
            self.log(f"❌ Unexpected error: {e}", "ERROR")
            import traceback
            traceback.print_exc()
            return False
        finally:
            self.cleanup()

def main():
    """Enhanced entry point"""
    print("🚀 Enhanced GitHub Repository Uploader v2.0")
    print("=" * 60)
    print("✨ Features:")
    print("  📦 Smart ZIP analysis")
    print("  🔄 Intelligent folder normalization")
    print("  📊 Detailed file analysis")
    print("  🎯 Optimized staging & pushing")
    print("=" * 60)
    
    uploader = GitUploader()
    success = uploader.run()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ SUCCESS: Repository uploaded successfully!")
        print(f"🔗 Check your repository at: https://github.com/{GITHUB_USERNAME}/{REPO_NAME}")
        print("🎉 Your files are now live on GitHub!")
    else:
        print("❌ FAILED: Upload process encountered errors")
        print("💡 Check the detailed logs above for troubleshooting")
        print("🔄 You can run the script again to retry")
    print("=" * 60)

if __name__ == "__main__":
    main()