resource "aws_efs_file_system" "main" {
  creation_token = "${local.prefix}-data"

  tags = merge(local.tags, {
    Name = "${local.prefix} efs"
  })
}

resource "aws_efs_access_point" "app" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/volume"

    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "777"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_efs_mount_target" "main" {
  for_each        = local.subnets_by_az
  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}
